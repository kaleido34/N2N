from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from PyPDF2 import PdfReader
import pytesseract
from PIL import Image
import io
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
CORS(app)

# Embedding model (for /embed)
embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    sentences = data['inputs']
    embeddings = embedding_model.encode(sentences).tolist()
    return jsonify({'embeddings': embeddings})

@app.route('/extract/pdf', methods=['POST'])
def extract_pdf():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        file.save(tmp.name)
        reader = PdfReader(tmp.name)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
    os.unlink(tmp.name)
    return jsonify({'text': text})

@app.route('/extract/pdf-ocr', methods=['POST'])
def extract_pdf_ocr():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        file.save(tmp.name)
        reader = PdfReader(tmp.name)
        text = ""
        for page in reader.pages:
            images = getattr(page, 'images', [])
            for img in images:
                img_bytes = img.data
                image = Image.open(io.BytesIO(img_bytes))
                text += pytesseract.image_to_string(image)
    os.unlink(tmp.name)
    return jsonify({'text': text})

@app.route('/extract/image', methods=['POST'])
def extract_image():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    image = Image.open(file.stream)
    text = pytesseract.image_to_string(image)
    return jsonify({'text': text})

@app.route('/extract/audio', methods=['POST'])
def extract_audio():
    # Placeholder for audio transcription (e.g., using openai-whisper)
    return jsonify({'error': 'Audio transcription not implemented yet'}), 501

@app.route('/extract/video', methods=['POST'])
def extract_video():
    # Placeholder for video transcription (e.g., using openai-whisper or youtube-transcript-api)
    return jsonify({'error': 'Video transcription not implemented yet'}), 501

if __name__ == '__main__':
    app.run(port=5005)
