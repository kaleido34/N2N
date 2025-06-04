# noise2nectar

**noise2nectar** is a web application designed to help users extract valuable insights and structured information from various types of content. It allows users to import documents, YouTube videos, audio files, and images, then processes this content using AI to generate summaries, flashcards, mind maps, quizzes, and more, organizing everything into user-specific "spaces".

## ✨ Key Features

*   **Multi-Content Ingestion:** Supports YouTube videos, PDF documents, audio files, and images.
*   **AI-Powered Processing:** Leverages AI (including Google AI and potentially Pinecone for vector search) for:
    *   Transcription of audio and video content.
    *   Text extraction from documents and images (OCR).
    *   Content summarization (text and audio summaries).
    *   Generation of flashcards, mind maps, and quizzes.
    *   Concept matching and term building.
*   **User Workspaces ("Spaces"):** Organize imported and processed content within personal spaces.
*   **User Authentication:** Secure user accounts and data managed via Supabase.
*   **Rich User Interface:** Built with Next.js, React, and Tailwind CSS for a modern and responsive experience.
*   **Data Visualization:** Includes GoJS for potential diagramming or mind map visualization.

## 🛠️ Tech Stack

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Backend (Node.js):** Next.js API Routes, Prisma (ORM)
*   **Backend (Python):** Separate Python server (e.g., Flask/FastAPI - `extractor_server.py`) for specialized processing tasks.
*   **Database:** PostgreSQL
*   **Authentication & BaaS:** Supabase
*   **AI & Machine Learning:**
    *   Google AI SDK
    *   Pinecone (Vector Database)
*   **UI Components:** Radix UI, Lucide Icons, Sonner (notifications)
*   **Form Management:** React Hook Form, Zod (validation)
*   **State Management:** Zustand
*   **Other Key Libraries:** Axios, pdf-parse, youtube-transcript, markdown-it

##  Prerequisites

*   Node.js (v18 or later recommended)
*   npm, yarn, or pnpm
*   Python (v3.8 or later recommended)
*   PostgreSQL server
*   Access to services like Supabase, Google AI, Pinecone (and their respective API keys).

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd noise2nectar
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root of the project and add the necessary environment variables. This file will be used by Next.js.

```env
# Prisma / PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME" # For Prisma Migrate


# Google AI
GOOGLE_API_KEY="your-google-ai-api-key"


# JWT Secret (generate a strong random string)
JWT_SECRET="your-jwt-secret"


**Note:** Ensure your PostgreSQL database is running and accessible with the credentials provided.

### 3. Install Frontend Dependencies

```bash
npm install
# or
# yarn install
# or
# pnpm install
```

### 4. Run Prisma Migrations

This will set up your database schema based on `prisma/schema.prisma`. The `prisma generate` command should run automatically after `npm install` due to the `postinstall` script in `package.json`.

```bash
npx prisma migrate dev --name init
```
(Replace `init` with a descriptive name for your initial migration if you prefer)

### 5. Set Up Python Backend (`python-servers`)

Navigate to the Python server directory and set up a virtual environment:

```bash
cd python-servers

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows:
# .\.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

cd ..
```

## ▶️ Running the Application

You'll typically need to run both the Next.js frontend/API and the Python server simultaneously.

### 1. Start the Next.js Development Server

```bash
npm run dev
```
This will start the Next.js application, usually on `http://localhost:3000`.

### 2. Start the Python Server

Open a new terminal, navigate to the `python-servers` directory, activate the virtual environment, and run the Python server:

```bash
cd python-servers
# Activate virtual environment (if not already active)
# .\.venv\Scripts\activate  (Windows)
# source .venv/bin/activate (macOS/Linux)

python extractor_server.py
```
(The command to run the Python server might vary if `extractor_server.py` uses a specific framework like Flask or FastAPI, e.g., `flask run` or `uvicorn extractor_server:app --reload`. Check the contents of `extractor_server.py` for specific run instructions if needed.)

### 3. Access the Application

Open your browser and navigate to `http://localhost:3000` (or the port Next.js is running on).

## 📜 Available Scripts (from `package.json`)

*   `npm run dev`: Starts the Next.js development server.
*   `npm run build`: Builds the Next.js application for production.
*   `npm run start`: Starts the Next.js production server.
*   `npm run lint`: Lints the codebase using Next.js's ESLint configuration.
*   `npm run postinstall`: (Runs automatically after `npm install`) Generates the Prisma client.

## 🏗️ Project Structure Overview

*   `.next/`: Next.js build output.
*   `app/`: Next.js App Router directory, contains pages and API routes.
*   `components/`: Shared React components.
*   `contexts/`: React context providers.
*   `hooks/`: Custom React hooks.
*   `lib/`: Utility functions, client libraries (e.g., Supabase, Prisma).
*   `prisma/`: Prisma schema (`schema.prisma`) and migration files.
*   `public/`: Static assets.
*   `python-servers/`: Contains the Python backend server (`extractor_server.py`) and its dependencies (`requirements.txt`).
*   `types/`: TypeScript type definitions.
*   `validations/`: Zod validation schemas.
*   `next.config.ts`: Next.js configuration.
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `package.json`: Project metadata, dependencies, and scripts.

## 🤝 Contributing



## 📄 License



