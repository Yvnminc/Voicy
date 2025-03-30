# Voicy System Patterns

## Architecture Overview

Voicy follows a client-server architecture with real-time communication:

```
┌────────────┐      WebSocket      ┌────────────┐     HTTP      ┌─────────────────┐
│            │◄─────Socket.io─────►│            │◄────REST─────►│                 │
│  Frontend  │                     │  Backend   │               │  Google Cloud   │
│  (Browser) │                     │  (Node.js) │               │  Speech API     │
│            │                     │            │               │                 │
└────────────┘                     └────────────┘               └─────────────────┘
                                       │    ▲
                                       │    │
                                       ▼    │
                                   ┌────────────┐
                                   │            │
                                   │   Audio    │
                                   │  Capture   │
                                   │            │
                                   └────────────┘
```

## Key Components

### Frontend
- **User Interface**: HTML/CSS for presentation
- **Client Logic**: JavaScript controlling UI state and Socket.io communication
- **Real-time Updates**: Socket.io client for receiving transcriptions and status updates

### Backend
- **Server**: Node.js Express application
- **Socket Handler**: Socket.io for real-time bidirectional communication
- **Audio Processing**: 
  - Primary: `node-record-lpcm16` for audio capture
  - Fallback: Direct process spawning for platform-specific recording tools
- **Transcription Service**: Google Cloud Speech API client

## Communication Patterns

### Client-Server Communication
- **Socket.io Events**:
  - `start`, `pause`, `resume`, `stop`: Control recording state
  - `transcription`: Send transcription results to client
  - `getHistory`, `clearHistory`: Manage transcript history
  - `setLanguage`: Change transcription language

### Audio Capture Strategy
- **Platform Detection**: Different recording strategies based on OS
- **Fallback Mechanism**: Multiple recording methods with automatic fallback
- **Error Recovery**: Automatic restart on recording failures

## Data Flow

### Audio Capture → Transcription
1. Audio capture creates a readable stream
2. Stream is piped through a transform to prepare for Speech API
3. Chunks are sent to Google Cloud Speech API
4. API returns interim and final results
5. Results are processed and broadcast to connected clients

### Transcript Management
1. Final transcriptions are stored in server memory
2. History is sent to clients upon connection or request
3. Continuous transcript is built on the client side
4. System handles both interim (real-time) and final results differently

## Design Patterns

### Observer Pattern
- Socket.io implements pub/sub mechanism for real-time updates
- Clients observe and react to server-side state changes

### Strategy Pattern
- Different audio capture strategies based on platform
- Interchangeable recording methods with common interface

### Factory Pattern
- Speech API client creates recognition streams with specific configurations
- Stream creation is encapsulated in the Transcriber class

## Error Handling Strategy
- **Connection Retry**: Automatic reconnection with backoff
- **Recording Recovery**: Restart recording on failure
- **Stream Restart**: Periodic stream renewal to prevent timeout
- **User Feedback**: Visual indicators for error states and clear error messages

## Platform-Specific Considerations
- **Windows**: Uses SoX with node-record-lpcm16
- **macOS**: Direct SoX process with file-based streaming
- **Linux**: Primarily uses arecord with fallback to SoX

## Future Extension Points
- Speaker diarization (separating different speakers)
- Persistent storage for transcriptions
- Additional language support
- Enhanced error recovery mechanisms 