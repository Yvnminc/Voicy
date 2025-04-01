# Voicy - Real-time Transcription App

Voicy is a real-time speech-to-text transcription application that uses Google Cloud Speech-to-Text API to transcribe audio from your microphone.

## Features

- **Real-time Transcription**: See your speech transcribed on the screen as you speak
- **Pause and Resume**: Pause the transcription and resume when ready
- **Transcript History**: Previously transcribed text is retained on the screen
- **Clean Interface**: Simple, intuitive UI for easy use
- **AI Chat**: Ask questions about your transcript and get AI-powered answers
- **Transcript Summaries**: Generate concise summaries of your transcribed content
- **Multi-language Support**: Default language is Chinese (zh-CN), with support for other languages

## Prerequisites

- Node.js (v12 or higher)
- Google Cloud Platform account with Speech-to-Text API enabled
- Google Cloud credentials (service account key)
- "rec" command-line tool (part of SoX - Sound eXchange)
- OpenRouter API key (for AI Chat and summary features)

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

## Configuration

1. Create a `.env` file in the project root with the following variables:
   ```
   # API Keys
   OPENROUTER_API_KEY=your_openrouter_api_key_here

   # Environment Settings
   NODE_ENV=development

   # Voicy Speech-to-Text app environment variables
   PORT=3000
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   DEFAULT_LANGUAGE=zh-CN
   ```

2. Customize the configuration as needed:
   - Change `PORT` if you want the app to run on a different port
   - Modify `DEFAULT_LANGUAGE` to change the default transcription language
   - Set `NODE_ENV` to `production` for production deployment

## Usage

1. Start the application:
   ```
   npm start
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000       # Original UI
   http://localhost:3000/new   # New modern UI
   ```

3. Use the interface buttons to control the transcription:
   - **Start**: Begin recording and transcribing
   - **Pause**: Temporarily pause recording
   - **Resume**: Continue recording after pausing
   - **Stop**: End the current recording session
   - **Clear**: Clear all transcript history
   - **Language Selector**: Change the transcription language
   
4. AI-powered features (in the new UI):
   - **Generate Summary**: Create a concise summary of your transcript
   - **AI Chat**: Ask questions about your transcript in the chat box

## Setting Up AI Features

1. Create an account on OpenRouter (https://openrouter.ai) and obtain an API key.

2. Update your `.env` file with the API key:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

3. Restart the application to enable the AI features.

## How It Works

1. The application uses the `node-record-lpcm16` package to record audio from your microphone.
2. The audio is streamed to the Google Cloud Speech-to-Text API via the `@google-cloud/speech` client.
3. The API returns both interim and final transcription results.
4. The results are displayed in real-time in the web interface using Socket.io for communication.
5. Final transcription results are added to a persistent history that remains even when pausing and resuming.
6. Socket.io events handle real-time communication between the frontend and backend.
7. The AI Chat feature uses OpenRouter API to generate responses based on transcript content.

## Socket.io Events

The application uses the following Socket.io events for communication:
- `start`: Begin recording
- `pause`: Pause recording
- `resume`: Resume recording
- `stop`: Stop recording
- `clearHistory`: Clear transcript history
- `getHistory`: Request transcript history
- `setLanguage`: Change transcription language
- `transcription`: Receive transcription results
- `transcriptHistory`: Receive transcript history

## Troubleshooting

- If you encounter `ENOENT: no such file or directory` errors, ensure the `rec` command is properly installed.
- If transcription doesn't work, check your Google Cloud credentials and make sure the Speech-to-Text API is enabled.
- If you see `Error: 7 PERMISSION_DENIED`, verify that your service account has the proper permissions.
- If AI features don't work, check that your OpenRouter API key is correctly set in the `.env` file.
- If system messages appear in your transcript, check the filtering logic in the frontend code.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Cloud Platform for the Speech-to-Text API
- OpenRouter for the AI chat and summarization capabilities
- Node.js and Express for the backend framework
- Socket.io for real-time communication
- The SoX project for audio recording capabilities