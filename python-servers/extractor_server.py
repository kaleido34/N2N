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

# API calls and audio processing
import requests
import speech_recognition as sr
from pydub import AudioSegment
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize speech recognizer
recognizer = sr.Recognizer()

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
    """
    Audio transcription using free speech recognition services
    """
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    # Generate a unique audio_id
    audio_id = str(uuid.uuid4())
    
    try:
        start_time = time.time()
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp_file:
            file.save(tmp_file.name)
            
            # Convert to WAV format for speech recognition
            try:
                audio = AudioSegment.from_file(tmp_file.name)
                wav_file = tmp_file.name + '.wav'
                audio.export(wav_file, format='wav')
            except Exception as e:
                # If conversion fails, try using the original file
                wav_file = tmp_file.name
        
        # Transcribe using multiple free services (fallback chain)
        transcript_text = ""
        service_used = ""
        
        with sr.AudioFile(wav_file) as source:
            audio_data = recognizer.record(source)
            
            # Try Google Speech Recognition (free tier - 60 min/month)
            try:
                transcript_text = recognizer.recognize_google(audio_data)
                service_used = "Google Speech Recognition (Free)"
            except sr.RequestError:
                # Try Wit.ai if Google fails
                wit_key = os.getenv('WIT_AI_KEY')
                if wit_key:
                    try:
                        transcript_text = recognizer.recognize_wit(audio_data, key=wit_key)
                        service_used = "Wit.ai (Free)"
                    except sr.RequestError:
                        pass
            except sr.UnknownValueError:
                transcript_text = "Could not understand audio"
                service_used = "Recognition failed"
        
        # Clean up temporary files
        try:
            os.unlink(tmp_file.name)
            if wav_file != tmp_file.name:
                os.unlink(wav_file)
        except:
            pass
        
        processing_time = time.time() - start_time
        
        # Create structured transcript
        transcript = {
            "text": transcript_text,
            "segments": [
                {
                    "id": 0,
                    "start": 0.0,
                    "end": processing_time,
                    "text": transcript_text,
                    "confidence": 0.8
                }
            ]
        }
        
        return jsonify({
            'audio_id': audio_id,
            'transcript': transcript,
            'text': transcript_text,
            'language': 'en',
            'processing_time': processing_time,
            'service_used': service_used
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Transcription failed: {str(e)}',
            'audio_id': audio_id
        }), 500

@app.route('/extract/video', methods=['POST'])
def extract_video():
    """
    Video transcription using free speech recognition (extracts audio from video)
    """
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    # Generate a unique video_id
    video_id = str(uuid.uuid4())
    
    try:
        start_time = time.time()
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp_file:
            file.save(tmp_file.name)
            
            # Extract audio from video and convert to WAV
            try:
                video = AudioSegment.from_file(tmp_file.name)
                wav_file = tmp_file.name + '.wav'
                video.export(wav_file, format='wav')
            except Exception as e:
                return jsonify({
                    'error': f'Could not extract audio from video: {str(e)}',
                    'video_id': video_id
                }), 500
        
        # Transcribe using multiple free services (fallback chain)
        transcript_text = ""
        service_used = ""
        
        with sr.AudioFile(wav_file) as source:
            audio_data = recognizer.record(source)
            
            # Try Google Speech Recognition (free tier - 60 min/month)
            try:
                transcript_text = recognizer.recognize_google(audio_data)
                service_used = "Google Speech Recognition (Free)"
            except sr.RequestError:
                # Try Wit.ai if Google fails
                wit_key = os.getenv('WIT_AI_KEY')
                if wit_key:
                    try:
                        transcript_text = recognizer.recognize_wit(audio_data, key=wit_key)
                        service_used = "Wit.ai (Free)"
                    except sr.RequestError:
                        pass
            except sr.UnknownValueError:
                transcript_text = "Could not understand audio"
                service_used = "Recognition failed"
        
        # Clean up temporary files
        try:
            os.unlink(tmp_file.name)
            os.unlink(wav_file)
        except:
            pass
        
        processing_time = time.time() - start_time
        
        # Create structured transcript
        transcript = {
            "text": transcript_text,
            "segments": [
                {
                    "id": 0,
                    "start": 0.0,
                    "end": processing_time,
                    "text": transcript_text,
                    "confidence": 0.8
                }
            ]
        }
        
        return jsonify({
            'video_id': video_id,
            'transcript': transcript,
            'text': transcript_text,
            'language': 'en',
            'processing_time': processing_time,
            'service_used': service_used
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Video transcription failed: {str(e)}',
            'video_id': video_id
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'Extractor server is running'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
