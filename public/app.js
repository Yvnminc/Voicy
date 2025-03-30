// DOM Elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const liveTranscript = document.getElementById('liveTranscript');
const continuousText = document.getElementById('continuousText');
const transcriptHistory = document.getElementById('transcriptHistory');
const languageSelect = document.getElementById('language-select');
const copyBadge = document.getElementById('copyBadge');

// Application state
let isRecording = false;
let isPaused = false;
let continuousTranscriptText = '';

// Connect to Socket.io server
const socket = io();

// Button click event handlers
startBtn.addEventListener('click', () => {
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
  startBtn.disabled = isRecording;
  pauseBtn.disabled = !isRecording || isPaused;
  resumeBtn.disabled = !isPaused;
  stopBtn.disabled = !isRecording;
  
  // Update status indicator
  statusIndicator.className = 'indicator';
  if (isRecording && !isPaused) {
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
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  isRecording = false;
  isPaused = false;
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
        item.text !== 'Listening...' && 
        item.text !== 'Paused' && 
        item.text !== 'Resumed' && 
        item.text !== 'Stopped' && 
        item.text !== 'Transcript history cleared' &&
        item.text !== '') {
      addToTranscriptHistory(item.text, item.timestamp);
    }
  });
});

// Request initial transcript history
socket.emit('getHistory'); 