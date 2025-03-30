const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Transcriber = require('./transcription');

// Initialize express app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  let transcriber = null;
  
  // Function to handle incoming transcriptions
  const handleTranscription = (transcript, isFinal, timestamp, history) => {
    socket.emit('transcription', {
      text: transcript,
      isFinal: isFinal,
      timestamp: timestamp,
      history: history
    });
  };
  
  // Create a new transcriber instance
  transcriber = new Transcriber(handleTranscription);
  
  // Handle language change
  socket.on('setLanguage', (languageCode) => {
    console.log(`Changing language to: ${languageCode}`);
    if (transcriber) {
      const newLanguage = transcriber.setLanguage(languageCode);
      socket.emit('languageChanged', newLanguage);
    }
  });
  
  // Handle start recording command
  socket.on('start', () => {
    console.log('Starting recording');
    transcriber.start();
  });
  
  // Handle pause recording command
  socket.on('pause', () => {
    console.log('Pausing recording');
    transcriber.pause();
  });
  
  // Handle resume recording command
  socket.on('resume', () => {
    console.log('Resuming recording');
    transcriber.resume();
  });
  
  // Handle stop recording command
  socket.on('stop', () => {
    console.log('Stopping recording');
    transcriber.stop();
  });
  
  // Handle get transcript history command
  socket.on('getHistory', () => {
    const history = transcriber.getTranscriptHistory();
    socket.emit('transcriptHistory', history);
  });
  
  // Handle clear transcript history command
  socket.on('clearHistory', () => {
    transcriber.clearTranscriptHistory();
  });
  
  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (transcriber) {
      transcriber.stop();
      transcriber = null;
    }
  });
});

// Start the server with port-finding functionality
function startServer(port) {
  return new Promise((resolve, reject) => {
    // Try to start server
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Open http://localhost:${port} in your browser`);
      resolve(port);
    });

    // Handle errors
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        server.close();
        // Try next port
        startServer(port + 1).then(resolve).catch(reject);
      } else {
        reject(e);
      }
    });
  });
}

// Initial port
const PORT = process.env.PORT || 3000;

// Start the server with port conflict handling
startServer(PORT).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 