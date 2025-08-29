import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Generate a unique audio_id
    const audio_id = uuidv4();
    
    // Convert audio to base64 for client-side processing
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Audio = buffer.toString('base64');
    const mimeType = file.type || 'audio/wav';
    
    // Return audio data for client-side transcription using Web Speech API
    return NextResponse.json({
      audio_id,
      audio_data: `data:${mimeType};base64,${base64Audio}`,
      file_name: file.name,
      file_size: file.size,
      mime_type: mimeType,
      service_used: "Client-side Web Speech API (Free)",
      note: "This audio will be transcribed using the browser's built-in speech recognition (completely free)"
    });
    
  } catch (error) {
    console.error('Audio preparation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Audio preparation failed: ' + errorMessage }, 
      { status: 500 }
    );
  }
} 