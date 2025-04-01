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

// LLM Integration Elements
const messageInput = document.getElementById('messageInput');
const sendToLLM = document.getElementById('sendToLLM');

// Application state
let isRecording = false;
let isPaused = false;
let continuousTranscriptText = '';
let isConnected = false;
let isSummaryGenerating = false;

// Connect to Socket.io server with improved connection options
const socket = io({
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  transports: ['websocket', 'polling']
});

// Helper Functions
function showConnectionStatus(message, type) {
  statusText.textContent = message;
  statusIndicator.className = 'indicator';
  
  if (type === 'connecting') {
    statusIndicator.classList.add('connecting');
  } else if (type === 'error') {
    statusIndicator.classList.add('error');
  } else if (type === 'listening') {
    statusIndicator.classList.add('listening');
  } else if (type === 'paused') {
    statusIndicator.classList.add('paused');
  }
  
  // Disable buttons until connected
  if (type !== 'connected') {
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
  }
}

// Show loading state while connecting
showConnectionStatus('Connecting to server...', 'connecting');

// Set initial language to Chinese
if (languageSelect) {
  languageSelect.value = 'zh-CN';
  // Trigger change event after socket is connected
  setTimeout(() => {
    languageSelect.dispatchEvent(new Event('change'));
  }, 1000);
}

// Event Listeners
startBtn.addEventListener('click', () => {
  if (!isConnected) {
    showError('Not connected to server. Please refresh the page.');
    return;
  }
  startRecording();
});

pauseBtn.addEventListener('click', pauseRecording);
resumeBtn.addEventListener('click', resumeRecording);
stopBtn.addEventListener('click', stopRecording);
clearBtn.addEventListener('click', clearTranscript);
copyBtn.addEventListener('click', copyTranscriptToClipboard);
languageSelect.addEventListener('change', () => changeLanguage(languageSelect.value));

// Summary Modal Events
summaryBtn.addEventListener('click', () => {
  summaryModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
  summaryModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === summaryModal) {
    summaryModal.style.display = 'none';
  }
});

generateSummaryBtn.addEventListener('click', () => {
  if (isSummaryGenerating) return;
  
  if (!continuousTranscriptText || continuousTranscriptText.trim() === '') {
    summaryContent.textContent = 'No transcript content available to summarize.';
    return;
  }
  
  // Show loading state
  isSummaryGenerating = true;
  generateSummaryBtn.innerHTML = '<div class="loading-spinner"></div>Generating...';
  generateSummaryBtn.disabled = true;
  summaryContent.textContent = 'Generating summary...';
  
  // Request summary from the server
  socket.emit('generateSummary', {
    style: summaryStyle.value
  });
});

// LLM Integration
if (sendToLLM) {
  sendToLLM.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (!message) return;
    
    console.log('Sending to LLM:', message);
    messageInput.value = '';
    
    alert('LLM feature coming soon!');
  });
}

// Error Handling
function showError(message) {
  console.error(message);
  alert(message);
}

// Recording Functions
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

// UI Updates
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

// Transcript Processing
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

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
  
  // Auto-scroll and update continuous transcript
  transcriptHistory.scrollTop = transcriptHistory.scrollHeight;
  appendToContinuousTranscript(text);
}

function appendToContinuousTranscript(text) {
  if (!text) return;
  
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
  
  if (systemMessages.some(msg => text.includes(msg)) || 
      text.includes('Error:') || 
      text.includes('Recording error') ||
      text.includes('RESTARTING REQUEST')) {
    return;
  }
  
  // Add space if needed
  if (continuousTranscriptText && !continuousTranscriptText.endsWith(' ')) {
    continuousTranscriptText += ' ';
  }
  
  continuousTranscriptText += text;
  continuousText.textContent = continuousTranscriptText;
  continuousText.scrollTop = continuousText.scrollHeight;
}

// Socket.io Event Handlers
socket.on('connect', () => {
  console.log('Connected to server');
  isConnected = true;
  showConnectionStatus('Connected', 'connected');
  updateUI();
  
  // Set language and request history
  socket.emit('setLanguage', 'zh-CN');
  socket.emit('getHistory');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  isConnected = false;
  showConnectionStatus('Connection error', 'error');
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

socket.on('languageChanged', (language) => {
  console.log(`Language changed to: ${language}`);
  languageSelect.value = language;
});

socket.on('transcription', (data) => {
  const { text, isFinal, timestamp } = data;
  
  // Update live transcript
  if (text) {
    liveTranscript.textContent = text;
  }
  
  // If final, add to history
  if (isFinal && text) {
    addToTranscriptHistory(text, timestamp);
    liveTranscript.textContent = '';
  }
});

socket.on('transcriptHistory', (history) => {
  transcriptHistory.innerHTML = '';
  continuousTranscriptText = '';
  
  if (history && history.length) {
    history.forEach(item => {
      if (item.text) {
        addToTranscriptHistory(item.text, item.timestamp);
      }
    });
  }
});

socket.on('summaryGenerated', (data) => {
  isSummaryGenerating = false;
  generateSummaryBtn.innerHTML = 'Generate';
  generateSummaryBtn.disabled = false;
  
  if (data.success) {
    summaryContent.textContent = data.summary;
    summaryContent.dataset.hasResult = 'true';
    
    if (data.timestamp) {
      const date = new Date(data.timestamp);
      summaryTimestamp.textContent = `Generated at ${date.toLocaleTimeString()}`;
    }
  } else {
    summaryContent.textContent = data.error || 'Failed to generate summary.';
  }
}); 