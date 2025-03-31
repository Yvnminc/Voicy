// DOM Elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const summaryBtn = document.getElementById('summaryBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const liveTranscript = document.getElementById('liveTranscript');
const continuousText = document.getElementById('continuousText');
const transcriptHistory = document.getElementById('transcriptHistory');
const languageSelect = document.getElementById('language-select');
const copyBadge = document.getElementById('copyBadge');

// Summary Modal Elements
const summaryModal = document.getElementById('summaryModal');
const closeModal = document.getElementById('closeModal');
const summaryContent = document.getElementById('summaryContent');
const summaryTimestamp = document.getElementById('summaryTimestamp');
const summaryStyle = document.getElementById('summary-style');
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const copySummaryBtn = document.getElementById('copySummaryBtn');

// Application state
let isRecording = false;
let isPaused = false;
let continuousTranscriptText = '';
let isConnected = false;
let isSummaryGenerating = false;

// Connect to Socket.io server with proper connection options
const socket = io({
  reconnectionAttempts: 5,         // Limit reconnection attempts
  reconnectionDelay: 1000,         // Start with 1s delay
  reconnectionDelayMax: 5000,      // Max 5s delay
  timeout: 10000,                  // Connection timeout
  transports: ['websocket', 'polling'] // Try WebSocket first, fallback to polling
});

// Show loading state while connecting
showConnectionStatus('Connecting to server...', 'connecting');

// Set initial language to Chinese
if (languageSelect) {
  languageSelect.value = 'zh-CN';
  // Trigger the change event to update the server
  setTimeout(() => {
    languageSelect.dispatchEvent(new Event('change'));
  }, 1000);
}

// Button click event handlers
startBtn.addEventListener('click', () => {
  if (!isConnected) {
    showError('Not connected to server. Please refresh the page.');
    return;
  }
  startRecording();
});

pauseBtn.addEventListener('click', () => {
  pauseRecording();
});

resumeBtn.addEventListener('click', () => {
  resumeRecording();
});

stopBtn.addEventListener('click', () => {
  stopRecording();
});

clearBtn.addEventListener('click', () => {
  clearTranscript();
});

copyBtn.addEventListener('click', () => {
  copyTranscriptToClipboard();
});

languageSelect.addEventListener('change', () => {
  changeLanguage(languageSelect.value);
});

// Summary button click event handlers
summaryBtn.addEventListener('click', () => {
  // Open the summary modal
  summaryModal.style.display = 'block';
  
  // Reset the summary content if it was previously generated
  if (summaryContent.dataset.hasResult === 'true') {
    summaryContent.textContent = 'Click "Generate" to create a summary of the transcript.';
    summaryContent.dataset.hasResult = 'false';
    summaryTimestamp.textContent = '';
  }
});

// Close modal when clicking the close button
closeModal.addEventListener('click', () => {
  summaryModal.style.display = 'none';
});

// Close modal when clicking outside the modal content
window.addEventListener('click', (event) => {
  if (event.target === summaryModal) {
    summaryModal.style.display = 'none';
  }
});

// Generate summary button click handler
generateSummaryBtn.addEventListener('click', () => {
  if (isSummaryGenerating) return;
  
  if (!continuousTranscriptText || continuousTranscriptText.trim() === '') {
    summaryContent.textContent = 'No transcript content available to summarize. Start recording and capture some speech first.';
    return;
  }
  
  // Show loading state
  isSummaryGenerating = true;
  const originalButtonText = generateSummaryBtn.innerHTML;
  generateSummaryBtn.innerHTML = '<div class="loading-spinner"></div>Generating...';
  generateSummaryBtn.disabled = true;
  summaryContent.textContent = 'Generating summary...';
  
  // Request summary from the server
  socket.emit('generateSummary', {
    style: summaryStyle.value
  });
});

// Copy summary button click handler
copySummaryBtn.addEventListener('click', () => {
  if (summaryContent.dataset.hasResult !== 'true') return;
  
  // Copy summary text to clipboard
  navigator.clipboard.writeText(summaryContent.textContent)
    .then(() => {
      const originalText = copySummaryBtn.textContent;
      copySummaryBtn.textContent = 'Copied!';
      
      setTimeout(() => {
        copySummaryBtn.textContent = originalText;
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy summary: ', err);
    });
});

// Connection status
function showConnectionStatus(message, type) {
  statusText.textContent = message;
  statusIndicator.className = 'indicator';
  if (type === 'connecting') {
    statusIndicator.classList.add('connecting');
  } else if (type === 'error') {
    statusIndicator.classList.add('error');
  }
  
  // Disable buttons until connected
  if (type !== 'connected') {
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
  }
}

function showError(message) {
  console.error(message);
  const errorMsg = document.createElement('div');
  errorMsg.className = 'error-message';
  errorMsg.textContent = message;
  errorMsg.style.color = 'red';
  errorMsg.style.padding = '10px';
  errorMsg.style.marginBottom = '10px';
  errorMsg.style.backgroundColor = '#ffeeee';
  errorMsg.style.borderRadius = '4px';
  
  // Remove existing error messages
  document.querySelectorAll('.error-message').forEach(el => el.remove());
  
  // Add to top of transcript container
  const container = document.querySelector('.transcript-container');
  container.insertBefore(errorMsg, container.firstChild);
  
  // Auto-remove after some time
  setTimeout(() => {
    errorMsg.remove();
  }, 5000);
}

// Recording control functions
function startRecording() {
  socket.emit('start');
  isRecording = true;
  isPaused = false;
  updateUI();
}

function pauseRecording() {
  socket.emit('pause');
  isPaused = true;
  updateUI();
}

function resumeRecording() {
  socket.emit('resume');
  isPaused = false;
  updateUI();
}

function stopRecording() {
  socket.emit('stop');
  isRecording = false;
  isPaused = false;
  updateUI();
}

function clearTranscript() {
  socket.emit('clearHistory');
  liveTranscript.textContent = '';
  transcriptHistory.innerHTML = '';
  continuousTranscriptText = '';
  continuousText.textContent = '';
}

function changeLanguage(languageCode) {
  socket.emit('setLanguage', languageCode);
}

function copyTranscriptToClipboard() {
  const textToCopy = continuousText.textContent;
  
  if (!textToCopy) {
    alert('No text to copy.');
    return;
  }
  
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      // Show the "Copied!" badge
      copyBadge.classList.add('visible');
      setTimeout(() => {
        copyBadge.classList.remove('visible');
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy text: ' + err);
    });
}

// Update UI based on application state
function updateUI() {
  // Update buttons
  startBtn.disabled = isRecording || !isConnected;
  pauseBtn.disabled = !isRecording || isPaused || !isConnected;
  resumeBtn.disabled = !isPaused || !isConnected;
  stopBtn.disabled = !isRecording || !isConnected;
  
  // Update status indicator
  statusIndicator.className = 'indicator';
  if (!isConnected) {
    statusIndicator.classList.add('error');
    statusText.textContent = 'Disconnected';
  } else if (isRecording && !isPaused) {
    statusIndicator.classList.add('listening');
    statusText.textContent = 'Listening...';
  } else if (isPaused) {
    statusIndicator.classList.add('paused');
    statusText.textContent = 'Paused';
  } else {
    statusText.textContent = 'Ready';
  }
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Add a transcript item to the history
function addToTranscriptHistory(text, timestamp) {
  const transcriptItem = document.createElement('div');
  transcriptItem.className = 'transcript-item';
  
  const transcriptText = document.createElement('div');
  transcriptText.className = 'transcript-text';
  transcriptText.textContent = text;
  
  const transcriptTime = document.createElement('div');
  transcriptTime.className = 'transcript-time';
  transcriptTime.textContent = formatTimestamp(timestamp);
  
  transcriptItem.appendChild(transcriptText);
  transcriptItem.appendChild(transcriptTime);
  
  transcriptHistory.appendChild(transcriptItem);
  
  // Scroll to the bottom of the transcript history
  transcriptHistory.scrollTop = transcriptHistory.scrollHeight;
  
  // Update continuous transcript
  appendToContinuousTranscript(text);
}

// Append text to the continuous transcript
function appendToContinuousTranscript(text) {
  if (!text) return;
  
  // Skip system messages - do not add them to the continuous transcript
  const systemMessages = [
    'Initializing microphone...',
    'Listening...',
    'Paused',
    'Resumed',
    'Stopped',
    'Transcript history cleared',
    'Failed to start recording',
  ];
  
  // If the text includes any system message or error message, skip it
  if (systemMessages.some(msg => text.includes(msg)) || 
      text.includes('Error:') || 
      text.includes('Recording error') ||
      text.includes('RESTARTING REQUEST')) {
    return;
  }
  
  // If not empty, add a space before new text
  if (continuousTranscriptText && !continuousTranscriptText.endsWith(' ')) {
    continuousTranscriptText += ' ';
  }
  
  continuousTranscriptText += text;
  continuousText.textContent = continuousTranscriptText;
  
  // Auto-scroll the continuous transcript
  continuousText.scrollTop = continuousText.scrollHeight;
}

// Socket.io event listeners
socket.on('connect', () => {
  console.log('Connected to server');
  isConnected = true;
  showConnectionStatus('Connected', 'connected');
  updateUI();
  
  // Set language to Chinese as default
  socket.emit('setLanguage', 'zh-CN');
  
  // Request transcript history once connected
  socket.emit('getHistory');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  isConnected = false;
  showConnectionStatus('Connection error', 'error');
  showError(`Connection error: ${error.message}`);
  updateUI();
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  isConnected = false;
  isRecording = false;
  isPaused = false;
  showConnectionStatus('Disconnected', 'error');
  updateUI();
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
  isConnected = true;
  showConnectionStatus('Connected', 'connected');
  updateUI();
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
  isConnected = false;
  showConnectionStatus('Failed to reconnect', 'error');
  showError('Failed to reconnect to server. Please refresh the page.');
  updateUI();
});

socket.on('languageChanged', (language) => {
  console.log(`Language changed to: ${language}`);
  // Update select if needed
  languageSelect.value = language;
});

socket.on('transcription', (data) => {
  // Handle interim results
  if (!data.isFinal) {
    liveTranscript.textContent = data.text;
  } else {
    // Handle final results
    if (data.text && !data.text.includes('RESTARTING REQUEST') && 
        data.text !== 'Listening...' && 
        data.text !== 'Paused' && 
        data.text !== 'Resumed' && 
        data.text !== 'Stopped' && 
        data.text !== 'Transcript history cleared' &&
        data.text !== '') {
      addToTranscriptHistory(data.text, data.timestamp);
    }
    
    // System messages handling
    if (data.text === 'Listening...') {
      isRecording = true;
      isPaused = false;
    } else if (data.text === 'Paused') {
      isPaused = true;
    } else if (data.text === 'Resumed') {
      isPaused = false;
    } else if (data.text === 'Stopped') {
      isRecording = false;
      isPaused = false;
      liveTranscript.textContent = '';
    } else if (data.text === 'Transcript history cleared') {
      continuousTranscriptText = '';
      continuousText.textContent = '';
    } else if (data.text.includes('Recording error')) {
      showError(data.text);
    }
    
    updateUI();
  }
});

socket.on('transcriptHistory', (history) => {
  // Clear existing history display
  transcriptHistory.innerHTML = '';
  
  // Clear continuous transcript
  continuousTranscriptText = '';
  continuousText.textContent = '';
  
  // Add each history item to the display and continuous transcript
  history.forEach(item => {
    if (item.text && item.isFinal && 
        !item.text.includes('RESTARTING REQUEST') && 
        !item.text.includes('Initializing microphone...') &&
        !item.text.includes('Listening...') && 
        !item.text.includes('Paused') && 
        !item.text.includes('Resumed') && 
        !item.text.includes('Stopped') && 
        !item.text.includes('Transcript history cleared') &&
        !item.text.includes('Error:') &&
        !item.text.includes('Recording error') &&
        item.text !== '') {
      addToTranscriptHistory(item.text, item.timestamp);
    }
  });
});

// Socket.io event handlers for summary
socket.on('summaryGenerated', (data) => {
  isSummaryGenerating = false;
  generateSummaryBtn.innerHTML = 'Generate';
  generateSummaryBtn.disabled = false;
  
  if (data.success) {
    summaryContent.textContent = data.summary;
    summaryContent.dataset.hasResult = 'true';
    
    // Format and display the timestamp
    if (data.timestamp) {
      const date = new Date(data.timestamp);
      summaryTimestamp.textContent = `Generated on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    }
  } else {
    summaryContent.textContent = data.error || 'Failed to generate summary. Please try again.';
    summaryContent.dataset.hasResult = 'false';
  }
}); 