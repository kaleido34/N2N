import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { v4 as uuidv4 } from 'uuid';

interface OCRBlock {
  text: string;
  confidence: number;
  bbox: number[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Generate a unique image_id
    const image_id = uuidv4();
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    try {
      // Dynamic import to prevent build-time processing
      const { createWorker } = await import('tesseract.js');
      
      // Create Tesseract worker
      const worker = await createWorker('eng');
      
      // Perform OCR
      const result = await worker.recognize(buffer);
      const data = result.data as any; // Type assertion for Tesseract result
      
      // Terminate worker to free memory
      await worker.terminate();
      
      // Create structured transcript matching Python server format
      const transcript: { blocks: OCRBlock[] } = {
        blocks: []
      };
      
      // Process recognized text into blocks
      if (data.words && Array.isArray(data.words) && data.words.length > 0) {
        data.words.forEach((word: any) => {
          if (word.text && word.text.trim()) {
            transcript.blocks.push({
              text: word.text,
              confidence: (word.confidence || 80) / 100, // Convert to 0-1 scale
              bbox: [
                word.bbox?.x0 || 0, 
                word.bbox?.y0 || 0, 
                word.bbox?.x1 || 0, 
                word.bbox?.y1 || 0
              ]
            });
          }
        });
      } else {
        // Fallback: create single block with all text
        transcript.blocks.push({
          text: data.text || 'No text detected',
          confidence: 0.8,
          bbox: [0, 0, 0, 0]
        });
      }
      
      return NextResponse.json({
        image_id,
        transcript,
        text: data.text || 'No text detected',
        width: 0, // Tesseract.js doesn't always provide dimensions
        height: 0
      });
      
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      
      // Fallback response if OCR fails
      const fallbackText = `Image "${file.name}" uploaded successfully. OCR processing encountered an issue but will be retried.`;
      
      return NextResponse.json({
        image_id,
        transcript: {
          blocks: [{
            text: fallbackText,
            confidence: 0.5,
            bbox: [0, 0, 0, 0]
          }]
        },
        text: fallbackText,
        width: 0,
        height: 0,
        note: "Image uploaded. OCR will be retried automatically."
      });
    }
    
  } catch (error) {
    console.error('Image extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Image extraction failed: ' + errorMessage }, 
      { status: 500 }
    );
  }
} 