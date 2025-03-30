const chalk = require('chalk');
const { Writable } = require('stream');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech').v1p1beta1;

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
    this.languageCode = 'en-US'; // Default language

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

  start() {
    if (this.isRecording) return;

    this.isRecording = true;
    this.startStream();
    
    try {
      // Use different recording configurations based on platform
      const recordOptions = {
        sampleRateHertz: sampleRateHertz,
        threshold: 0,
        // Use a lower silence value to prevent early cutting
        silence: '0.5',
        keepSilence: true
      };
      
      // Add platform-specific options
      if (process.platform === 'darwin') {
        // macOS specific options
        recordOptions.recordProgram = 'sox';
        recordOptions.device = 'default';
        recordOptions.channels = 1;
        recordOptions.audioType = 'raw';
        recordOptions.encoding = 'signed-integer';
        recordOptions.endian = 'little';
        recordOptions.bits = 16;
      } else {
        // Default options for other platforms
        recordOptions.recordProgram = 'rec';
      }
      
      // Start recording with proper error handling
      this.recordingStream = recorder
        .record(recordOptions)
        .stream()
        .on('error', err => {
          console.error('Audio recording error: ', err);
          // Don't stop on error, try to continue
          this.onTranscription(`Recording error: ${err.message}`, true, Date.now(), this.transcriptHistory);
          // Try to restart recording after a short delay if we're still supposed to be recording
          if (this.isRecording) {
            setTimeout(() => {
              if (this.isRecording && !this.recordingStream) {
                this.start();
              }
            }, 2000);
          }
        });

      this.recordingStream.pipe(this.audioInputStreamTransform);
      this.onTranscription('Listening...', true, Date.now(), this.transcriptHistory);
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.onTranscription(`Failed to start recording: ${error.message}`, true, Date.now(), this.transcriptHistory);
      this.isRecording = false;
    }
  }

  pause() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    
    if (this.recordingStream) {
      try {
        this.recordingStream.unpipe(this.audioInputStreamTransform);
        this.recordingStream.destroy();
      } catch (error) {
        console.error('Error pausing recording:', error);
      }
      this.recordingStream = null;
    }
    
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
}

module.exports = Transcriber; 