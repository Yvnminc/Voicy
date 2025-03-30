# Voicy Technical Context

## Technology Stack

### Frontend
- **HTML/CSS/JavaScript**: Core web technologies
- **Socket.io Client**: Real-time communication
- **Modern CSS**: Flexbox, Grid, and responsive design

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web server framework
- **Socket.io**: Real-time bidirectional event-based communication
- **node-record-lpcm16**: Audio recording library
- **@google-cloud/speech**: Google Cloud Speech-to-Text API client

### External Dependencies
- **SoX**: Sound eXchange, a cross-platform audio processing tool
- **arecord**: Audio recording utility on Linux systems
- **Google Cloud Speech-to-Text API**: Cloud-based speech recognition service

## Development Setup

### Prerequisites
- Node.js >= 14.x
- npm >= 6.x
- SoX installed on the system (required for audio capture)
- On Linux: arecord installed
- Google Cloud credentials (JSON key file)

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Place Google Cloud credentials in `./credentials.json`
4. Start the server: `npm start`
5. Access the application at: `http://localhost:3000`

### Required Environment Variables
- None currently required (credentials are loaded from file)

## Technical Constraints

### Audio Capture
- Requires native audio tools (SoX, arecord) installed on the system
- Audio quality depends on microphone hardware and system settings
- Platform-specific differences in audio capture behavior

### Google Cloud Speech API
- Requires valid API credentials
- Subject to usage limits and quotas
- Network dependent for real-time transcription
- Latency varies based on connection quality

### Browser Compatibility
- Requires modern browsers with WebSocket support
- Audio permissions must be granted by the user
- Some features may have varying support across browsers

## Performance Considerations

### Backend
- Memory usage increases with transcript history size
- Audio processing is CPU intensive
- Long-running sessions may require stream restarts

### Frontend
- DOM updates for real-time transcription can be performance-intensive
- Large transcript history may cause rendering slowdowns

### Network
- WebSocket connections require stable internet
- Audio data transmission is bandwidth-intensive
- Reconnection logic needed for unstable connections

## Security Considerations

### Audio Data
- Audio is processed in memory and not persisted
- Transmitted over WebSockets (potentially not encrypted in development)
- Sent to Google Cloud (subject to their privacy policy)

### API Credentials
- Google Cloud credentials must be secured
- Not included in version control
- Should have appropriate access restrictions

## Deployment Considerations

### Server Requirements
- Node.js runtime environment
- Audio capture tools installed (SoX, arecord)
- Network access to Google Cloud APIs

### Scaling
- Socket.io can be scaled with Redis adapter
- Multiple server instances possible with shared session state
- Consider containerization (Docker) for consistent environments

## Testing Strategy

### Backend
- Unit tests for transcription logic
- Mock audio streams for consistent testing
- Socket.io event testing

### Frontend
- UI component testing
- Socket event simulation
- Cross-browser compatibility testing 