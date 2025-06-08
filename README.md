# noise2nectar

**noise2nectar** is a web application designed to help users extract valuable insights and structured information from various types of content. It allows users to import documents, YouTube videos, audio files, and images, then processes this content using AI to generate summaries, flashcards, mind maps, quizzes, and more, organizing everything into user-specific "spaces".

## Key Features

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

## Tech Stack

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


1234