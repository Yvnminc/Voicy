require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Transcriber = require('./transcription');
const summaryGenerator = require('./summary');
const aiChat = require('./ai-chat');

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

// Route for the new UI
app.get('/new', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'new-index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
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
  
  // Handle AI chat message
  socket.on('aiChatMessage', async (data) => {
    console.log('Received AI chat message:', data.message);
    
    try {
      // Get the transcript content to use as context
      const transcriptContent = transcriber.getFullTranscript();
      
      if (!transcriptContent || transcriptContent.length === 0) {
        socket.emit('aiChatResponse', {
          success: false,
          error: 'No transcript content available for context.',
          message: data.message,
          response: null
        });
        return;
      }
      
      // Send the request to the AI service
      const response = await aiChat.generateResponse(
        transcriptContent,
        data.message,
        {
          language: transcriber.languageCode || 'en'
        }
      );
      
      // Send the response back to the client
      socket.emit('aiChatResponse', {
        success: true,
        message: data.message,
        response: response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error processing AI chat message:', error);
      socket.emit('aiChatResponse', {
        success: false,
        error: 'Failed to generate AI response: ' + error.message,
        message: data.message,
        response: null
      });
    }
  });
  
  // Handle generate summary request
  socket.on('generateSummary', async (options = {}) => {
    console.log('Generating summary with options:', options);
    try {
      // Get the full transcript from the transcriber
      const transcriptContent = transcriber.getFullTranscript();
      
      if (!transcriptContent || transcriptContent.length === 0) {
        socket.emit('summaryGenerated', { 
          success: false,
          error: 'No transcript content available to summarize.',
          summary: null
        });
        return;
      }
      
      // Generate the summary
      const summary = await summaryGenerator.generateSummary(
        transcriptContent, 
        {
          language: transcriber.languageCode || 'en',
          ...options
        }
      );
      
      // Send back to client
      socket.emit('summaryGenerated', { 
        success: true,
        summary,
        timestamp: new Date().toISOString()
      });
      
      // Also send to the new endpoint for modal display
      socket.emit('summaryResponse', {
        summary,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error generating summary:', error);
      socket.emit('summaryGenerated', { 
        success: false,
        error: 'Failed to generate summary: ' + error.message,
        summary: null
      });
      
      // Also send error to the new endpoint
      socket.emit('summaryResponse', {
        error: 'Failed to generate summary: ' + error.message
      });
    }
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
      console.log(`For the new UI, open http://localhost:${port}/new`);
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

// Export the startServer function to be used in index.js
module.exports = { startServer }; 