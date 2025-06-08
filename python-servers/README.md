# Python Extractor Server

This Flask server handles document, image, audio, and video processing for the noise2nectar application.

## Features

- **PDF Text Extraction**: Extract text from PDF documents
- **PDF OCR**: Extract text from scanned PDFs using OCR
- **Image OCR**: Extract text from images using Tesseract
- **Audio Transcription**: Transcribe audio files using OpenAI Whisper API
- **Video Transcription**: Extract and transcribe audio from video files

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables (optional):
```bash
# Optional: For additional transcription service (Wit.ai)
WIT_AI_KEY=your_wit_ai_key_here

# Optional: Set custom port (default: 5000)
PORT=5000
```

3. Run the server:
```bash
python extractor_server.py
```

## API Endpoints

### Health Check
- `GET /health` - Check server status

### Document Processing
- `POST /extract/pdf` - Extract text from PDF
- `POST /extract/pdf-ocr` - Extract text from scanned PDF using OCR

### Image Processing
- `POST /extract/image` - Extract text from image using OCR

### Audio/Video Processing
- `POST /extract/audio` - Transcribe audio file (FREE - uses Google Speech Recognition)
- `POST /extract/video` - Transcribe video file (FREE - uses Google Speech Recognition)

## Dependencies

- Flask & Flask-CORS (web server)
- PyPDF2 (PDF processing)
- Pillow & pytesseract (image OCR)
- SpeechRecognition & pydub (FREE audio/video transcription)
- python-dotenv (environment variables)

## Docker

Build and run with Docker:
```bash
docker build -t extractor-server .
docker run -p 5000:5000 -e OPENAI_API_KEY=your_key extractor-server
```

## Cost Information

Audio/video transcription is **100% FREE**:
- **Google Speech Recognition**: 60 minutes/month free (excellent accuracy)
- **Wit.ai**: Unlimited free tier (good accuracy) 
- **No API keys required** for basic functionality
- Supports multiple languages
- No local GPU required 