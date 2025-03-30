# Backend Structure Document

This document provides a clear overview of the backend architecture, database management, API design, hosting solutions, infrastructure components, security measures, and monitoring strategies. It is written in everyday language so that anyone, regardless of technical background, can easily understand how the web-based voice memo application is set up.

## 1. Backend Architecture

The backend of our voice memo app is designed to efficiently handle voice recordings, transcription, and AI-driven summarizations while remaining responsive and scalable. Here’s what defines our backend architecture:

- **Serverless Approach:** The application uses Next.js API routes to build lightweight, serverless functions. These functions handle tasks such as audio uploads, triggering the Google Speech-to-Text API, and processing AI-powered summarizations.
- **Integration with External APIs:** 
  - Google Speech-to-Text API is used for real-time audio transcription.
  - OpenAI's GPT-4o is leveraged for summarizing transcriptions and powering the chat interface.
- **Supabase as a Core Component:** Supabase handles our audio storage and data management with a backend powered by a PostgreSQL database and file storage services.
- **Design Patterns & Frameworks:**
  - Use of Next.js leads to clear separation between pages, components, and API endpoints.
  - Clean architecture is maintained by organizing code into directories such as `app`, `components`, `hooks`, `lib`, `types`, and `utils`.
- **Focus on Scalability & Maintainability:** Since its modular design allows us to add features or adjust services with minimal impact on other parts of the system. Load is managed efficiently by leveraging cloud functions and managed databases.

## 2. Database Management

Our project uses Supabase for all data handling and storage, leveraging PostgreSQL for structured data and Supabase Storage for audio files.

- **Technology Used:**
  - PostgreSQL (SQL database).
  - Supabase file storage for managing MP3 audio files.
- **Data Organization:**
  - **Recordings:** Each audio file’s metadata (such as file path, transcription text, summary, and timestamps) is stored in the database.
  - **Folders:** A table is dedicated to folder details with fields to organize and manage recordings.
  - **Transcriptions & Summaries:** These are stored in relation to the recordings, ensuring that every uploaded or recorded file has its corresponding domain data.
- **Data Access & Management Practices:**
  - Use of structured queries ensures efficient access and modification of data.
  - The system is optimized for both read and write operations, ensuring quick data access and storage efficiency.

## 3. Database Schema

Below is a human-readable explanation of the database schema, followed by an example SQL schema for PostgreSQL.

### Human-Readable Overview:

- **Folders Table:**
  - Contains information about each folder created by the user (e.g., folder ID and name).

- **Recordings Table:**
  - Stores metadata for each voice memo, such as the file path of the MP3, a reference to the folder it belongs to, the transcription, and the AI-generated summarization.
  - Also stores timestamps such as creation and update dates.

### Example SQL Schema (PostgreSQL):

-- Table for storing folders
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing recordings
CREATE TABLE recordings (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    file_path VARCHAR(512) NOT NULL,
    transcription TEXT,
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## 4. API Design and Endpoints

The app uses RESTful API design principles to allow seamless communication between the frontend and backend. Here’s an outline of the key endpoints:

- **/api/recordings:**
  - POST: To upload a new audio file and create a corresponding recording entry.
  - GET: To fetch a list of recordings, possibly filtered by folder.
  - DELETE: To remove a recording.

- **/api/transcribe:**
  - POST: To send an audio file to the Google Speech-to-Text API and receive the transcribed text.

- **/api/summary:**
  - POST: To send the transcription text to OpenAI for summarization and receive a concise summary.

- **/api/folders:**
  - POST: To create a new folder.
  - GET: To retrieve all folders and their associated recordings.
  - DELETE: To remove a folder (and optionally its recordings).

These endpoints make sure that each core functionality (audio management, real-time transcription, summarization, and folder organization) is accessible and maintainable.

## 5. Hosting Solutions

Our backend is hosted using a mix of cloud-based services to optimize for performance, scalability, and cost-effectiveness:

- **Cloud Providers and Platforms:**
  - **Vercel/Netlify:** The Next.js application is deployed on a platform optimized for serverless apps, ensuring that our API endpoints are scalable and responsive. (Developers often choose Vercel for Next.js deployments due to its seamless integration.)
  - **Supabase:** Handles not only our PostgreSQL database but also our file storage for MP3s. This provides a unified solution for data management with built-in scalability.
- **Benefits:**
  - High availability and reliability, ensuring that user recordings and transcriptions are always accessible.
  - Cost-effective scaling, as serverless functions only run when needed.
  - Reduced maintenance overhead with managed services.

## 6. Infrastructure Components

Several components work together to ensure a smooth and efficient user experience:

- **Load Balancers:** Automatically distribute incoming API requests across serverless functions to prevent overloading any one endpoint.
- **Caching Mechanisms:** Frequently requested data, such as folder lists and recent recordings, may be cached to speed up access.
- **Content Delivery Networks (CDNs):** Static assets and media files are served through CDNs to ensure low latency and fast delivery worldwide.
- **File Storage Solutions:** Supabase file storage manages the MP3 audio files efficiently, allowing quick retrieval and reliable backups.

Together, these components ensure that the backend remains fast, reliable, and capable of handling both routine and peak loads without hiccups.

## 7. Security Measures

Security is a top priority, especially when handling user data and integrating with external APIs. Here’s how we protect our backend:

- **Authentication & Authorization:**
  - Although this is a single-user application, robust API keys and tokens will be used to secure communications with external services like Google and OpenAI.
  - Clerk Auth is available from the starter kit, ensuring that additional layers of user verification can be added if needed in the future.

- **Data Encryption:**
  - All data in transit is encrypted using HTTPS, ensuring secure communication between the client and backend.
  - Sensitive data stored in Supabase is protected with strict access rules and modern encryption practices.

- **Input Validation & Error Handling:**
  - Rigorous checks ensure that only valid MP3 files and acceptable data are processed. Clear error messages are provided when inputs fail validation.
  - Middleware (such as the one defined in `middleware.ts`) helps catch and log any unauthorized access attempts or errors.

## 8. Monitoring and Maintenance

To ensure that the backend remains reliable and performs well, ongoing monitoring and proactive maintenance are essential:

- **Monitoring Tools:**
  - Use of tools like Sentry (or any similar error tracking system) to catch and log errors as they occur.
  - Supabase and the hosting platform’s dashboards provide real-time performance metrics.

- **Maintenance Strategies:**
  - Regularly update dependencies and libraries to patch any security vulnerabilities.
  - Routine database backups and performance optimization checks.
  - Automated alerts for downtime or unusual activity to ensure that issues are addressed immediately.

## 9. Conclusion and Overall Backend Summary

In summary, our backend infrastructure is built around a blend of modern, cloud-based solutions and serverless functions, designed to offer a robust, scalable, and secure environment for handling audio recordings and transcriptions. Key aspects include:

- **A modular serverless architecture** using Next.js API routes.
- **Supabase-driven data management,** including PostgreSQL and file storage for MP3 files.
- **Seamless API integration** with Google Speech-to-Text and OpenAI for real-time transcription and summarization.
- **Cloud hosting solutions** that prioritize reliability, scalability, and cost-effectiveness.
- **Security practices** ensuring that user data and service communications remain protected.
- **Monitoring and maintenance** strategies to keep the app running smoothly and efficiently.

By leveraging a well-organized backend structure, the project is poised to deliver excellent performance and user experience, making it easy to maintain and scale as needed.