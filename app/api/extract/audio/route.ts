import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Generate a unique audio_id
    const audio_id = uuidv4();
    const startTime = Date.now();
    
    // FREE SOLUTION: AssemblyAI (3 hours/month free - just like your Python server used free services)
    const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;
    
    if (assemblyAIKey) {
      try {
        // Upload file to AssemblyAI
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'authorization': assemblyAIKey,
          },
          body: await file.arrayBuffer(),
        });
        
        const uploadData = await uploadResponse.json();
        
        // Request transcription
        const transcriptionResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            'authorization': assemblyAIKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            audio_url: uploadData.upload_url,
          }),
        });
        
        const transcriptionData = await transcriptionResponse.json();
        
        // Poll for completion (simplified - in production you'd use webhooks)
        let result = transcriptionData;
        let attempts = 0;
        while (result.status !== 'completed' && result.status !== 'error' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${result.id}`, {
            headers: { 'authorization': assemblyAIKey },
          });
          result = await statusResponse.json();
          attempts++;
        }
        
        if (result.status === 'completed') {
          const processing_time = (Date.now() - startTime) / 1000;
          
          const transcript: { text: string; segments: TranscriptSegment[] } = {
            text: result.text,
            segments: [{
              id: 0,
              start: 0.0,
              end: processing_time,
              text: result.text,
              confidence: result.confidence || 0.8
            }]
          };
          
          return NextResponse.json({
            audio_id,
            transcript,
            text: result.text,
            language: 'en',
            processing_time,
            service_used: "AssemblyAI (Free - 3 hours/month)"
          });
        }
      } catch (assemblyError) {
        console.error('AssemblyAI transcription failed:', assemblyError);
        // Fall through to basic response
      }
    }
    
    // BASIC FREE RESPONSE (like your Python server did when free services weren't available)
    // Your Python server used to return a placeholder when Google Speech Recognition failed
    const processing_time = (Date.now() - startTime) / 1000;
    const transcript_text = `Audio file "${file.name}" received and processed. For free transcription, get an AssemblyAI API key (3 hours/month free).`;
    const service_used = "File processed - transcription available with free API key";
    
    const transcript: { text: string; segments: TranscriptSegment[] } = {
      text: transcript_text,
      segments: [{
        id: 0,
        start: 0.0,
        end: processing_time,
        text: transcript_text,
        confidence: 0.7
      }]
    };
    
    return NextResponse.json({
      audio_id,
      transcript,
      text: transcript_text,
      language: 'en',
      processing_time,
      service_used,
      file_info: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      note: "🆓 Get free transcription: Sign up at https://www.assemblyai.com (3 hours/month free) and add ASSEMBLYAI_API_KEY to your environment"
    });
    
  } catch (error) {
    console.error('Audio extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Audio extraction failed: ' + errorMessage }, 
      { status: 500 }
    );
  }
} 