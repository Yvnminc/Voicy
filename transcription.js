const chalk = require('chalk');
const { Writable } = require('stream');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech').v1p1beta1;
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration variables
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const streamingLimit = 290000; // Increased from 10000ms to 290s

class Transcriber {
  constructor(onTranscription) {
    // Set up Speech client
    this.client = new speech.SpeechClient({
      keyFilename: './credentials.json'
    });

    // Initialize variables
    this.recognizeStream = null;
    this.restartCounter = 0;
    this.audioInput = [];
    this.lastAudioInput = [];
    this.resultEndTime = 0;
    this.isFinalEndTime = 0;
    this.finalRequestEndTime = 0;
    this.newStream = true;
    this.bridgingOffset = 0;
    this.lastTranscriptWasFinal = false;
    this.isRecording = false;
    this.recordingStream = null;
    this.onTranscription = onTranscription || this.defaultOnTranscription;
    this.transcriptHistory = [];
    this.languageCode = 'zh-CN'; // Default language set to Chinese
    this.audioProcess = null;
    
    // Create a temp directory for audio files if needed
    this.tempDir = path.join(os.tmpdir(), 'voicy-audio');
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create temp directory:', error);
      this.tempDir = os.tmpdir();
    }

    // Create the audio input stream transform
    this.audioInputStreamTransform = new Writable({
      write: this.handleAudioWrite.bind(this),
      final: this.handleAudioFinal.bind(this)
    });
  }

  setLanguage(languageCode) {
    // Set language code (e.g., 'en-US' or 'zh-CN')
    this.languageCode = languageCode;
    console.log(`Language set to: ${languageCode}`);
    return this.languageCode;
  }

  defaultOnTranscription(transcript, isFinal) {
    if (isFinal) {
      console.log(chalk.green(`${transcript}\n`));
    } else {
      console.log(chalk.red(`${transcript}`));
    }
  }

  handleAudioWrite(chunk, encoding, next) {
    if (this.newStream && this.lastAudioInput.length !== 0) {
      // Approximate math to calculate time of chunks
      const chunkTime = streamingLimit / this.lastAudioInput.length;
      if (chunkTime !== 0) {
        if (this.bridgingOffset < 0) {
          this.bridgingOffset = 0;
        }
        if (this.bridgingOffset > this.finalRequestEndTime) {
          this.bridgingOffset = this.finalRequestEndTime;
        }
        const chunksFromMS = Math.floor(
          (this.finalRequestEndTime - this.bridgingOffset) / chunkTime
        );
        this.bridgingOffset = Math.floor(
          (this.lastAudioInput.length - chunksFromMS) * chunkTime
        );

        for (let i = chunksFromMS; i < this.lastAudioInput.length; i++) {
          if (this.recognizeStream) {
            this.recognizeStream.write(this.lastAudioInput[i]);
          }
        }
      }
      this.newStream = false;
    }

    this.audioInput.push(chunk);

    if (this.recognizeStream && this.isRecording) {
      this.recognizeStream.write(chunk);
    }

    next();
  }

  handleAudioFinal() {
    if (this.recognizeStream) {
      this.recognizeStream.end();
    }
  }

  speechCallback(stream) {
    // Convert API result end time from seconds + nanoseconds to milliseconds
    this.resultEndTime =
      stream.results[0].resultEndTime.seconds * 1000 +
      Math.round(stream.results[0].resultEndTime.nanos / 1000000);

    // Calculate correct time based on offset from audio sent twice
    const correctedTime =
      this.resultEndTime - this.bridgingOffset + streamingLimit * this.restartCounter;

    let transcript = '';
    if (stream.results[0] && stream.results[0].alternatives[0]) {
      transcript = stream.results[0].alternatives[0].transcript;
    }

    if (stream.results[0].isFinal) {
      // Save final transcriptions to history
      this.transcriptHistory.push({
        timestamp: correctedTime,
        text: transcript,
        isFinal: true
      });
      
      this.onTranscription(transcript, true, correctedTime, this.transcriptHistory);
      this.isFinalEndTime = this.resultEndTime;
      this.lastTranscriptWasFinal = true;
    } else {
      this.onTranscription(transcript, false, correctedTime, this.transcriptHistory);
      this.lastTranscriptWasFinal = false;
    }
  }

  startStream() {
    // Clear current audioInput
    this.audioInput = [];

    // Speech recognition request config
    const request = {
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: this.languageCode,
      },
      interimResults: true,
    };

    // Initiate (Reinitiate) a recognize stream
    this.recognizeStream = this.client
      .streamingRecognize(request)
      .on('error', err => {
        if (err.code === 11) {
          // Stream disconnected, restart if we're still recording
          if (this.isRecording) {
            this.restartStream();
          }
        } else {
          console.error('API request error ' + err);
          this.onTranscription(`Error: ${err.message}`, true, Date.now(), this.transcriptHistory);
        }
      })
      .on('data', this.speechCallback.bind(this));

    // Restart stream when streamingLimit expires
    this.streamingTimeout = setTimeout(() => {
      if (this.isRecording) {
        this.restartStream();
      }
    }, streamingLimit);
  }

  restartStream() {
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream.removeListener('data', this.speechCallback);
      this.recognizeStream = null;
    }
    
    if (this.resultEndTime > 0) {
      this.finalRequestEndTime = this.isFinalEndTime;
    }
    this.resultEndTime = 0;

    this.lastAudioInput = [];
    this.lastAudioInput = this.audioInput;

    this.restartCounter++;
    
    if (!this.lastTranscriptWasFinal) {
      this.onTranscription("", true, Date.now(), this.transcriptHistory);
    }
    
    this.onTranscription(`RESTARTING REQUEST`, true, streamingLimit * this.restartCounter, this.transcriptHistory);
    
    this.newStream = true;

    if (this.isRecording) {
      this.startStream();
    }
  }

  // Check if sox and arecord are installed
  checkRecordingTools() {
    const checkSox = spawn('which', ['sox']);
    const checkArecord = spawn('which', ['arecord']);
    
    return new Promise((resolve) => {
      let hasSox = false;
      let hasArecord = false;
      
      checkSox.on('close', (code) => {
        hasSox = code === 0;
        
        checkArecord.on('close', (code) => {
          hasArecord = code === 0;
          resolve({ hasSox, hasArecord });
        });
      });
    });
  }

  // Use node-record-lpcm16 with basic options (fallback)
  startBasicRecording() {
    try {
      const options = {
        sampleRateHertz: sampleRateHertz,
        threshold: 0,
        silence: '1.0',
        keepSilence: true
      };
      
      if (process.platform === 'win32') {
        options.recordProgram = 'sox';
      } else {
        options.recordProgram = process.platform === 'darwin' ? 'sox' : 'arecord';
      }
      
      this.recordingStream = recorder
        .record(options)
        .stream()
        .on('error', this.handleRecordingError.bind(this));
        
      this.recordingStream.pipe(this.audioInputStreamTransform);
      return true;
    } catch (error) {
      console.error('Basic recording failed:', error);
      return false;
    }
  }
  
  // Use direct sox command on macOS
  startMacOSRecording() {
    try {
      // Create a random filename for this recording
      const filename = path.join(this.tempDir, `recording-${Date.now()}.raw`);
      
      // Start sox directly with simpler options
      this.audioProcess = spawn('sox', [
        '-d',                  // Use default audio device
        '-t', 'raw',           // Output format: raw
        '-r', sampleRateHertz.toString(), // Sample rate
        '-b', '16',            // Bit depth
        '-c', '1',             // Channels (mono)
        '-e', 'signed-integer', // Encoding
        filename               // Output file
      ]);
      
      // Handle process events
      this.audioProcess.stderr.on('data', (data) => {
        console.log('sox stderr:', data.toString());
      });
      
      this.audioProcess.on('error', (err) => {
        console.error('sox process error:', err);
        this.handleRecordingError(err);
      });
      
      this.audioProcess.on('close', (code) => {
        console.log(`sox process exited with code ${code}`);
        if (code !== 0 && this.isRecording) {
          this.handleRecordingError(new Error(`sox exited with code ${code}`));
        }
      });
      
      // Set up a file stream to read from the output file
      // and pipe it to the audio input stream transform
      let lastSize = 0;
      
      // Create the file if it doesn't exist
      fs.writeFileSync(filename, Buffer.alloc(0));
      
      // Set up an interval to read data from the file as it grows
      this.fileReadInterval = setInterval(() => {
        try {
          if (!this.isRecording) {
            clearInterval(this.fileReadInterval);
            return;
          }
          
          const stats = fs.statSync(filename);
          if (stats.size > lastSize) {
            const readStream = fs.createReadStream(filename, {
              start: lastSize,
              end: stats.size - 1
            });
            
            readStream.on('data', (chunk) => {
              if (this.audioInputStreamTransform && this.isRecording) {
                this.audioInputStreamTransform.write(chunk);
              }
            });
            
            readStream.on('end', () => {
              lastSize = stats.size;
            });
          }
        } catch (error) {
          console.error('Error reading audio file:', error);
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('macOS recording failed:', error);
      return false;
    }
  }
  
  handleRecordingError(err) {
    console.error('Recording error:', err);
    this.onTranscription(`Recording error: ${err.message}`, true, Date.now(), this.transcriptHistory);
    
    // Try to restart recording after a delay if still recording
    if (this.isRecording) {
      setTimeout(() => {
        if (this.isRecording) {
          console.log('Attempting to restart recording...');
          this.stopRecordingProcesses();
          this.startRecordingProcesses();
        }
      }, 2000);
    }
  }
  
  stopRecordingProcesses() {
    // Clean up any existing recording processes
    if (this.recordingStream) {
      try {
        this.recordingStream.unpipe(this.audioInputStreamTransform);
        this.recordingStream.destroy();
      } catch (error) {
        console.error('Error stopping recording stream:', error);
      }
      this.recordingStream = null;
    }
    
    if (this.audioProcess) {
      try {
        this.audioProcess.kill('SIGTERM');
      } catch (error) {
        console.error('Error stopping audio process:', error);
      }
      this.audioProcess = null;
    }
    
    if (this.fileReadInterval) {
      clearInterval(this.fileReadInterval);
      this.fileReadInterval = null;
    }
  }
  
  async startRecordingProcesses() {
    // Determine which recording method to use
    const tools = await this.checkRecordingTools();
    console.log('Available recording tools:', tools);
    
    let success = false;
    
    // Try the platform-specific method first
    if (process.platform === 'darwin' && tools.hasSox) {
      console.log('Using macOS recording method');
      success = this.startMacOSRecording();
    } else if (process.platform === 'linux' && tools.hasArecord) {
      console.log('Using Linux arecord recording method');
      // Use arecord-specific options
      const options = {
        sampleRateHertz: sampleRateHertz,
        threshold: 0,
        silence: '1.0',
        keepSilence: true,
        recordProgram: 'arecord',
        device: 'default'
      };
      
      try {
        this.recordingStream = recorder
          .record(options)
          .stream()
          .on('error', this.handleRecordingError.bind(this));
          
        this.recordingStream.pipe(this.audioInputStreamTransform);
        success = true;
      } catch (error) {
        console.error('Linux recording failed:', error);
        success = false;
      }
    }
    
    // Fall back to basic method if platform-specific failed
    if (!success) {
      console.log('Falling back to basic recording method');
      success = this.startBasicRecording();
    }
    
    if (!success) {
      const errorMsg = 'All recording methods failed. Please check your audio settings and microphone.';
      console.error(errorMsg);
      this.onTranscription(errorMsg, true, Date.now(), this.transcriptHistory);
      this.isRecording = false;
    }
    
    return success;
  }

  async start() {
    if (this.isRecording) return;

    this.isRecording = true;
    this.startStream();
    
    try {
      // Notify that we're starting the recording
      this.onTranscription('Initializing microphone...', true, Date.now(), this.transcriptHistory);
      
      // Start the recording process
      const success = await this.startRecordingProcesses();
      
      if (success) {
        this.onTranscription('Listening...', true, Date.now(), this.transcriptHistory);
      } else {
        this.isRecording = false;
        this.onTranscription('Failed to start recording', true, Date.now(), this.transcriptHistory);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.onTranscription(`Failed to start recording: ${error.message}`, true, Date.now(), this.transcriptHistory);
      this.isRecording = false;
    }
  }

  pause() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    
    // Stop all recording processes
    this.stopRecordingProcesses();
    
    if (this.streamingTimeout) {
      clearTimeout(this.streamingTimeout);
    }
    
    this.onTranscription('Paused', true, Date.now(), this.transcriptHistory);
  }

  resume() {
    if (this.isRecording) return;
    
    this.start();
    this.onTranscription('Resumed', true, Date.now(), this.transcriptHistory);
  }

  stop() {
    this.pause();
    
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }
    
    this.onTranscription('Stopped', true, Date.now(), this.transcriptHistory);
    
    // Reset all counters and state
    this.restartCounter = 0;
    this.audioInput = [];
    this.lastAudioInput = [];
    this.resultEndTime = 0;
    this.isFinalEndTime = 0;
    this.finalRequestEndTime = 0;
    this.newStream = true;
    this.bridgingOffset = 0;
    this.lastTranscriptWasFinal = false;
  }
  
  getTranscriptHistory() {
    return this.transcriptHistory;
  }
  
  clearTranscriptHistory() {
    this.transcriptHistory = [];
    this.onTranscription('Transcript history cleared', true, Date.now(), this.transcriptHistory);
  }

  /**
   * Returns the full transcript from the history
   * @returns {string} Full transcript text
   */
  getFullTranscript() {
    if (!this.transcriptHistory || this.transcriptHistory.length === 0) {
      return '';
    }
    
    // Filter out system messages and join the transcript parts
    return this.transcriptHistory
      .filter(item => {
        // Skip system messages
        const systemMessages = [
          'Initializing microphone...',
          'Listening...',
          'Paused',
          'Resumed',
          'Stopped',
          'Transcript history cleared',
          'Failed to start recording'
        ];
        
        return item.text && 
               item.isFinal &&
               !systemMessages.some(msg => item.text.includes(msg)) &&
               !item.text.includes('Error:') &&
               !item.text.includes('Recording error') &&
               !item.text.includes('RESTARTING REQUEST') &&
               item.text.trim() !== '';
      })
      .map(item => item.text.trim())
      .join(' ');
  }
}

module.exports = Transcriber; 