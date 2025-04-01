/**
 * Voicy - Real-time Speech-to-Text Transcription App
 * 
 * This is the main entry point for the application.
 * It starts the server which handles both the transcription and web interface.
 */

// Main application entry point
require('dotenv').config();
const server = require('./server');

// Start the server
const PORT = process.env.PORT || 3000;
server.startServer(PORT).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 