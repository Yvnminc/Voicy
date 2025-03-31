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
                                       │    │                   ┌─────────────────┐
                                       ▼    │                   │                 │
                                   ┌────────────┐      HTTP     │   OpenRouter   │
                                   │            │◄────REST─────►│   LLM API      │
                                   │   Audio    │               │                 │
                                   │  Capture   │               │                 │
                                   └────────────┘               └─────────────────┘
```

## Key Components

### Frontend
- **User Interface**: HTML/CSS for presentation
- **Client Logic**: JavaScript controlling UI state and Socket.io communication
- **Real-time Updates**: Socket.io client for receiving transcriptions and status updates
- **Summary Modal**: Interface for generating and displaying meeting summaries

### Backend
- **Server**: Node.js Express application
- **Socket Handler**: Socket.io for real-time bidirectional communication
- **Audio Processing**: 
  - Primary: `node-record-lpcm16` for audio capture
  - Fallback: Direct process spawning for platform-specific recording tools
- **Transcription Service**: Google Cloud Speech API client
- **Summary Generator**: OpenRouter API integration for meeting summaries

## Communication Patterns

### Client-Server Communication
- **Socket.io Events**:
  - `start`, `pause`, `resume`, `stop`: Control recording state
  - `transcription`: Send transcription results to client
  - `getHistory`, `clearHistory`: Manage transcript history
  - `setLanguage`: Change transcription language
  - `generateSummary`: Request meeting summary generation
  - `summaryGenerated`: Return generated summary to client

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

### Meeting Summary Generation
1. User clicks "Generate Summary" button in UI
2. Frontend sends `generateSummary` event with style preferences
3. Backend retrieves filtered transcript (system messages removed)
4. Backend sends transcript to OpenRouter API with appropriate prompt
5. OpenRouter returns summarized content
6. Backend sends summary back to frontend via `summaryGenerated` event
7. Frontend displays summary in modal

## Design Patterns

### Observer Pattern
- Socket.io implements pub/sub mechanism for real-time updates
- Clients observe and react to server-side state changes

### Strategy Pattern
- Different audio capture strategies based on platform
- Interchangeable recording methods with common interface
- Multiple summary styles with the same interface

### Factory Pattern
- Speech API client creates recognition streams with specific configurations
- Stream creation is encapsulated in the Transcriber class

## Error Handling Strategy
- **Connection Retry**: Automatic reconnection with backoff
- **Recording Recovery**: Restart recording on failure
- **Stream Restart**: Periodic stream renewal to prevent timeout
- **User Feedback**: Visual indicators for error states and clear error messages
- **API Fallbacks**: Graceful handling of external API failures

## Platform-Specific Considerations
- **Windows**: Uses SoX with node-record-lpcm16
- **macOS**: Direct SoX process with file-based streaming
- **Linux**: Primarily uses arecord with fallback to SoX

## Security Considerations
- API keys stored in environment variables, not in code
- No storage of sensitive transcript data
- Token-based authentication for API calls

## Future Extension Points
- Speaker diarization (separating different speakers)
- Persistent storage for transcriptions
- Additional language support
- Enhanced error recovery mechanisms
- Advanced summary customization options 