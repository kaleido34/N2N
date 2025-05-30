from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import json
import uuid
import time

# PDF extraction
from PyPDF2 import PdfReader

# OCR for images
import pytesseract
from PIL import Image
import io

# Audio transcription
import whisper

# Embedding model
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
CORS(app)

# Load whisper model (small for better balance of accuracy and speed)
whisper_model = whisper.load_model("small")

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
    
    # Generate a unique doc_id
    doc_id = str(uuid.uuid4())
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        file.save(tmp.name)
        reader = PdfReader(tmp.name)
        
        # Create structured JSON for transcript
        transcript = {
            "pages": []
        }
        
        # Extract text from each page
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            
            # Add page to transcript
            transcript["pages"].append({
                "number": i + 1,
                "text": page_text,
                "confidence": 1.0  # PyPDF2 doesn't provide confidence metrics
            })
            
        # Get metadata
        metadata = {}
        if reader.metadata:
            for key in reader.metadata:
                if reader.metadata[key]:
                    metadata[key] = str(reader.metadata[key])
    
    os.unlink(tmp.name)
    
    # Full text for searching and other uses
    full_text = ""
    for page in transcript["pages"]:
        full_text += page["text"] + "\n"
    
    return jsonify({
        'doc_id': doc_id,
        'transcript': transcript,
        'text': full_text,
        'metadata': metadata,
        'page_count': len(transcript["pages"])
    })

@app.route('/extract/pdf-ocr', methods=['POST'])
def extract_pdf_ocr():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    # Generate a unique doc_id
    doc_id = str(uuid.uuid4())
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        file.save(tmp.name)
        reader = PdfReader(tmp.name)
        
        # Create structured JSON for transcript
        transcript = {
            "pages": []
        }
        
        # Process each page
        for i, page in enumerate(reader.pages):
            # First try normal text extraction
            page_text = page.extract_text() or ""
            
            # If no text was extracted, try OCR on images
            if not page_text.strip():
                images = getattr(page, 'images', [])
                page_image_texts = []
                
                for img in images:
                    img_bytes = img.data
                    image = Image.open(io.BytesIO(img_bytes))
                    img_text = pytesseract.image_to_string(image)
                    if img_text.strip():
                        page_image_texts.append(img_text)
                
                page_text = "\n".join(page_image_texts)
            
            # Add page to transcript
            transcript["pages"].append({
                "number": i + 1,
                "text": page_text,
                "confidence": 0.8 if page_text.strip() else 0.0  # Estimated confidence
            })
    
    os.unlink(tmp.name)
    
    # Full text for searching and other uses
    full_text = ""
    for page in transcript["pages"]:
        full_text += page["text"] + "\n"
    
    return jsonify({
        'doc_id': doc_id,
        'transcript': transcript,
        'text': full_text,
        'page_count': len(transcript["pages"])
    })

@app.route('/extract/image', methods=['POST'])
def extract_image():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    # Generate a unique image_id
    image_id = str(uuid.uuid4())
    
    # Open the image
    image = Image.open(file.stream)
    
    # Get detailed OCR data
    ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    
    # Simple text extraction
    text = pytesseract.image_to_string(image)
    
    # Create structured transcript
    transcript = {
        "blocks": []
    }
    
    # Process OCR data to create blocks
    current_block = []
    current_block_num = -1
    
    for i in range(len(ocr_data['text'])):
        if ocr_data['text'][i].strip():
            # If we're in a new block, add the previous block to transcript
            if ocr_data['block_num'][i] != current_block_num and current_block:
                transcript["blocks"].append({
                    "text": " ".join(current_block),
                    "confidence": sum(conf for conf in ocr_data['conf'] if conf > 0) / len(current_block) if len(current_block) > 0 else 0,
                    "bbox": [min(ocr_data['left']), min(ocr_data['top']), max(ocr_data['left'] + ocr_data['width']), max(ocr_data['top'] + ocr_data['height'])]
                })
                current_block = []
            
            current_block_num = ocr_data['block_num'][i]
            current_block.append(ocr_data['text'][i])
    
    # Add the last block if it exists
    if current_block:
        transcript["blocks"].append({
            "text": " ".join(current_block),
            "confidence": sum(conf for conf in ocr_data['conf'] if conf > 0) / len(current_block) if len(current_block) > 0 else 0,
            "bbox": [min(ocr_data['left']), min(ocr_data['top']), max(ocr_data['left'] + ocr_data['width']), max(ocr_data['top'] + ocr_data['height'])]
        })
    
    return jsonify({
        'image_id': image_id,
        'transcript': transcript,
        'text': text,
        'width': image.width,
        'height': image.height
    })

@app.route('/extract/audio', methods=['POST'])
def extract_audio():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    # Generate a unique audio_id
    audio_id = str(uuid.uuid4())
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
        file.save(tmp.name)
        
        # Use whisper for transcription
        start_time = time.time()
        result = whisper_model.transcribe(tmp.name)
        processing_time = time.time() - start_time
        
        # Create structured transcript
        transcript = {
            "text": result["text"],
            "segments": []
        }
        
        # Add segments with timestamps
        for segment in result["segments"]:
            transcript["segments"].append({
                "id": segment["id"],
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"],
                "confidence": segment.get("confidence", 1.0)
            })
    
    os.unlink(tmp.name)
    
    return jsonify({
        'audio_id': audio_id,
        'transcript': transcript,
        'text': result["text"],
        'language': result.get("language", "en"),
        'processing_time': processing_time
    })

@app.route('/extract/video', methods=['POST'])
def extract_video():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    # Generate a unique video_id
    video_id = str(uuid.uuid4())
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
        file.save(tmp.name)
        
        # Use whisper for audio transcription from video
        start_time = time.time()
        result = whisper_model.transcribe(tmp.name)
        processing_time = time.time() - start_time
        
        # Create structured transcript
        transcript = {
            "text": result["text"],
            "segments": []
        }
        
        # Add segments with timestamps
        for segment in result["segments"]:
            transcript["segments"].append({
                "id": segment["id"],
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"],
                "confidence": segment.get("confidence", 1.0)
            })
    
    os.unlink(tmp.name)
    
    return jsonify({
        'video_id': video_id,
        'transcript': transcript,
        'text': result["text"],
        'language': result.get("language", "en"),
        'processing_time': processing_time
    })

if __name__ == '__main__':
    app.run(port=5005)
