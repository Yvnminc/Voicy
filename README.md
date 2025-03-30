# Voicy - Real-time Transcription App

Voicy is a real-time speech-to-text transcription application that uses Google Cloud Speech-to-Text API to transcribe audio from your microphone.

## Features

- **Real-time Transcription**: See your speech transcribed on the screen as you speak
- **Pause and Resume**: Pause the transcription and resume when ready
- **Transcript History**: Previously transcribed text is retained on the screen
- **Clean Interface**: Simple, intuitive UI for easy use

## Prerequisites

- Node.js (v12 or higher)
- Google Cloud Platform account with Speech-to-Text API enabled
- Google Cloud credentials (service account key)
- "rec" command-line tool (part of SoX - Sound eXchange)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/voicy.git
   cd voicy
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Make sure your Google Cloud credentials file is in the project root as `credentials.json`.

4. Install the SoX audio tool:
   - On macOS: `brew install sox`
   - On Ubuntu/Debian: `sudo apt-get install sox`
   - On Windows: Download from http://sox.sourceforge.net/

## Usage

1. Start the application:
   ```
   npm start
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Use the interface buttons to control the transcription:
   - **Start**: Begin recording and transcribing
   - **Pause**: Temporarily pause recording
   - **Resume**: Continue recording after pausing
   - **Stop**: End the current recording session
   - **Clear**: Clear all transcript history

## How It Works

1. The application uses the `node-record-lpcm16` package to record audio from your microphone.
2. The audio is streamed to the Google Cloud Speech-to-Text API via the `@google-cloud/speech` client.
3. The API returns both interim and final transcription results.
4. The results are displayed in real-time in the web interface using Socket.io for communication.
5. Final transcription results are added to a persistent history that remains even when pausing and resuming.

## Troubleshooting

- If you encounter `ENOENT: no such file or directory` errors, ensure the `rec` command is properly installed.
- If transcription doesn't work, check your Google Cloud credentials and make sure the Speech-to-Text API is enabled.
- If you see `Error: 7 PERMISSION_DENIED`, verify that your service account has the proper permissions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Cloud Platform for the Speech-to-Text API
- Node.js and Express for the backend framework
- Socket.io for real-time communication
- The SoX project for audio recording capabilities 