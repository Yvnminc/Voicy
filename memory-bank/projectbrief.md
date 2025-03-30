# Voicy Project Brief

## Project Overview
Voicy is a speech-to-text application designed to provide real-time transcription services. It captures audio from the user's microphone, sends it to a speech recognition service (Google Cloud Speech API), and displays the transcription in real-time.

## Core Requirements
1. Real-time speech-to-text transcription
2. Support for multiple languages with Chinese (zh-CN) as the default
3. Ability to pause, resume, and stop recording
4. Transcript history with timestamps
5. Continuous transcript display (only showing actual user speech, not system messages)
6. Copy functionality for the transcript
7. Clear visual feedback on connection and recording status

## Technical Requirements
1. Node.js backend with Socket.io for real-time communication
2. Frontend web interface that is responsive and user-friendly
3. Google Cloud Speech API integration for speech recognition
4. Reliable audio capture across platforms (Windows, macOS, Linux)
5. Error handling and recovery for audio capture issues
6. Persistent transcript history during a session

## Current Status
- Backend implementation is complete with audio capture and Google Cloud Speech API integration
- Frontend test interface is in place with basic functionality
- The frontend and backend are currently being developed independently and will need to be carefully merged

## Limitations
- Dependency on external recording tools (sox, arecord)
- Google Cloud Speech API requires credentials and has usage limits
- Real-time transcription may have latency depending on network conditions

## Next Steps
1. Complete frontend development with improved UX
2. Integrate frontend and backend components
3. Implement additional features based on user feedback
4. Improve error handling and recovery
5. Add support for additional languages 