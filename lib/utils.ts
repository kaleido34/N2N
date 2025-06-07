import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Innertube } from 'youtubei.js/web';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface transcriptInterface {
    text: string;
    duration: number;
    offset: number;
    lang: string;
}

export interface ChunkData {
    id: string;
    content_id: string; // Generalized from video_id to content_id
    text: string;
    startTime: number;
    endTime: number;
    source?: string; // Source reference (e.g., 'Page 5', '12:34', 'Diagram 1')
}

export interface MindMapNode {
  key: number;
  text: string;
  category?: string;
}

export interface MindMapData extends Record<string, any> {
  nodes: MindMapNode[];
  links: { from: number; to: number }[];
  from: number;
  to: number;
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function fetchTranscripts(
    video_id: string
): Promise<transcriptInterface[] | null> {
    try {
        // Create an Innertube instance to access YouTube's internal API
        const youtube = await Innertube.create({
            lang: 'en',
            location: 'US',
            retrieve_player: false,
        });

        // Fetch video info and transcript using the video ID
        const info = await youtube.getInfo(video_id);
        const transcriptData = await info.getTranscript();

        if (!transcriptData || !transcriptData.transcript?.content?.body?.initial_segments) {
            console.error("No transcript data returned for video:", video_id);
            return null;
        }

        // Map the transcript segments to our interface format
        const segments = transcriptData.transcript.content.body.initial_segments;
        const formattedTranscript: transcriptInterface[] = segments.map((segment: any) => ({
            text: segment.snippet.text,
            duration: segment.end_ms - segment.start_ms,
            offset: segment.start_ms / 1000, // Convert from milliseconds to seconds
            lang: "en",
        }));

        return formattedTranscript;
    } catch (transcriptError: unknown) {
        console.error("Error fetching transcript for video:", video_id);
        console.error("Error details:", transcriptError instanceof Error ? transcriptError.message : transcriptError);
        return null;
    }
}

/**
 * Convert PDF page data to transcript format for processing
 * @param pdfData Structured PDF data from extractor server
 */
export function pdfToTranscript(pdfData: any): transcriptInterface[] {
    const transcript: transcriptInterface[] = [];
    let offset = 0;
    
    // Handle structured page data
    if (pdfData.transcript && pdfData.transcript.pages) {
        pdfData.transcript.pages.forEach((page: any, index: number) => {
            // Split page into paragraphs or use whole page as one chunk
            const paragraphs = page.text.split('\n\n').filter((p: string) => p.trim().length > 0);
            
            if (paragraphs.length > 0) {
                paragraphs.forEach((paragraph: string) => {
                    transcript.push({
                        text: paragraph,
                        duration: 0, // Not applicable for PDFs
                        offset: offset++, // Use incremental offset
                        lang: "en",
                    });
                });
            } else if (page.text.trim()) {
                transcript.push({
                    text: page.text,
                    duration: 0,
                    offset: offset++,
                    lang: "en",
                });
            }
        });
    } else if (typeof pdfData.text === 'string') {
        // Fallback for simple text extraction
        const paragraphs = pdfData.text.split('\n\n').filter((p: string) => p.trim().length > 0);
        paragraphs.forEach((paragraph: string) => {
            transcript.push({
                text: paragraph,
                duration: 0,
                offset: offset++,
                lang: "en",
            });
        });
    }
    
    return transcript;
}

/**
 * Convert audio transcript data to structured format for processing
 * @param audioData Structured audio data from extractor server
 */
export function audioToTranscript(audioData: any): transcriptInterface[] {
    const transcript: transcriptInterface[] = [];
    
    if (audioData.transcript && audioData.transcript.segments) {
        audioData.transcript.segments.forEach((segment: any) => {
            transcript.push({
                text: segment.text,
                duration: segment.end - segment.start,
                offset: segment.start,
                lang: audioData.language || "en",
            });
        });
    } else if (typeof audioData.text === 'string') {
        // Fallback for simple text extraction
        transcript.push({
            text: audioData.text,
            duration: 0,
            offset: 0,
            lang: "en",
        });
    }
    
    return transcript;
}

/**
 * Convert image OCR data to transcript format for processing
 * @param imageData Structured image data from extractor server
 */
export function imageToTranscript(imageData: any): transcriptInterface[] {
    const transcript: transcriptInterface[] = [];
    let offset = 0;
    
    if (imageData.transcript && imageData.transcript.blocks) {
        imageData.transcript.blocks.forEach((block: any) => {
            transcript.push({
                text: block.text,
                duration: 0, // Not applicable for images
                offset: offset++,
                lang: "en",
            });
        });
    } else if (typeof imageData.text === 'string') {
        // Fallback for simple text extraction
        const lines = imageData.text.split('\n').filter((l: string) => l.trim().length > 0);
        lines.forEach((line: string) => {
            transcript.push({
                text: line,
                duration: 0,
                offset: offset++,
                lang: "en",
            });
        });
    }
    
    return transcript;
}

export const preprocessTranscript = async (
    transcript: transcriptInterface[],
    chunkSize = 300
): Promise<
    { text: string; startTime: number | null; endTime: number | null }[]
> => {
    const chunks: {
        text: string;
        startTime: number | null;
        endTime: number | null;
    }[] = [];
    let currentChunk = {
        text: "",
        startTime: null as number | null,
        endTime: null as number | null,
    };

    transcript.forEach((item, index) => {
        if (!currentChunk.startTime)
            currentChunk.startTime = item.offset as number;

        currentChunk.text += (currentChunk.text ? " " : "") + item.text;
        currentChunk.endTime = (item.offset + item.duration) as number;

        if (
            currentChunk.text.split(" ").length >= chunkSize ||
            index === transcript.length - 1
        ) {
            chunks.push({ ...currentChunk });
            currentChunk = { text: "", startTime: null, endTime: null };
        }
    });
    return chunks;
};

export const summarizeChunks = async (transcripts: string): Promise<string> => {
  const MAX_RETRIES = 2;
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      const prompt = `Create a concise, structured summary of educational content in valid JSON format without markdown or code blocks.

STRUCTURE:
Return exactly this JSON structure:
{
  "sections": [
    {
      "type": "paragraph",
      "content": "Introduction about the main topic and key learning objectives"
    },
    {
      "type": "heading", 
      "level": 2,
      "content": "First Main Topic"
    },
    {
      "type": "paragraph",
      "content": "Explanation of this topic"
    },
    {
      "type": "heading",
      "level": 2,
      "content": "Second Main Topic"
    },
    {
      "type": "paragraph",
      "content": "Explanation of this topic"
    },
    {
      "type": "heading",
      "level": 2,
      "content": "Key Insights"
    },
    {
      "type": "paragraph",
      "content": "Main takeaways and applications"
    }
  ]
}

GUIDELINES:
- Total length: ~600 words 
- Introduction (~100 words): Main subject, purpose, context
- 2-3 Topic Sections (~300 words total): Cover core concepts, use content-specific headings
- Key Insights (~100 words): Important takeaways and applications
- Use clear, direct language without jargon
- Avoid source references like "in this video"
- Focus on key concepts only
- Ensure your response is valid JSON that can be parsed with JSON.parse()`;

      const generateContent = await model.generateContent([prompt, transcripts]);
      return generateContent?.response?.text();
    } catch (error) {
      retries++;
      if (retries > MAX_RETRIES) {
        console.error('Max retries reached for summarizeChunks:', error);
        // Return a well-structured fallback summary
        const fallbackSummary = {
          "sections": [
            {
              "type": "heading",
              "level": 2,
              "content": "Data  Unavailable"
            },
            {
              "type": "paragraph",
              "content": "We're unable to generate a summary at this time. The AI service is currently experiencing high demand."
            },
            {
              "type": "paragraph",
              "content": "Please try refreshing the page or check back later when the service load has decreased."
            },
            {
              "type": "list_item",
              "content": "You can still access other features like flashcards, quizzes, and mindmaps."
            },
            {
              "type": "list_item",
              "content": "The full transcript is available and can be viewed by clicking on the 'Transcripts' button."
            },
            {
              "type": "heading",
              "level": 2,
              "content": "Key Insights"
            },
            {
              "type": "paragraph",
              "content": "While the AI-generated summary is unavailable, you can explore the content directly through the full transcript."
            }
          ]
        };
        return JSON.stringify(fallbackSummary);
      }
      
      // Wait before retrying - exponential backoff
      const waitTime = Math.pow(2, retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Return a fallback if we somehow exit the loop without returning
  return JSON.stringify({
    "sections": [
      {
        "type": "heading",
        "level": 2,
        "content": "Summary Unavailable"
      },
      {
        "type": "paragraph",
        "content": "We couldn't generate a summary for this content. Please try again later."
      }
    ]
  });
};



interface Flashcard extends Record<string, any> {
  question: string;
  hint: string;
  answer: string;
  explanation: string;
  source: string;
}

interface FlashcardResponse {
  flashcards: Flashcard[];
}

export const generateFlashCards = async (transcripts: string): Promise<FlashcardResponse> => {
    // Import the parseAiResponse helper
    const { parseAiResponse } = await import('./ai-utils');
    
    const prompt = `Create educational flashcards from content. Return valid JSON only.

REQUIRED JSON STRUCTURE:
{
  "flashcards": [
    {
      "question": "Clear, direct question about the topic",
      "hint": "Helpful clue without giving away the answer",
      "answer": "Complete, accurate answer",
      "explanation": "Brief explanation providing context",
      "source": "Timestamp, page reference, or N/A"
    }
  ]
}

GUIDELINES:
- Generate 8-15 flashcards covering key topics
- Include factual, conceptual, and application questions
- Provide clear questions and concise answers
- Add helpful hints that guide thinking
- Mix easy, medium, and challenging questions
- Use timestamps for videos/audio (MM:SS format)
- Use page references for documents ("Page 3")
- Use "N/A" when no specific reference applies
- Ensure valid JSON that can be parsed with JSON.parse()
- Keep questions under 25 words
- Keep explanations brief but informative`;
    const generateContent = await model.generateContent([prompt, transcripts]);
    const responseText = generateContent.response.text();
    
    try {
      // Parse the response using our helper function
      const flashcardData = parseAiResponse<FlashcardResponse>(responseText);
      return flashcardData;
    } catch (error) {
      console.error('Error parsing flashcard response:', error);
      console.error('Raw response:', responseText);
      throw new Error('Failed to generate flashcards. The AI response format was invalid.');
    }
};

interface QuizQuestion extends Record<string, any> {
  question: string;
  options: string[];
  correct_option: string;
  explanation: string;
  source_reference: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  question_type?: 'factual' | 'conceptual' | 'application' | 'analysis';
}

interface QuizResponse {
  quiz: QuizQuestion[];
}

export const generateQuiz = async (transcripts: string): Promise<QuizResponse> => {
    // Import the parseAiResponse helper
    const { parseAiResponse } = await import('./ai-utils');
    
    // Add retry logic with exponential backoff
    const MAX_RETRIES = 2;
    let retries = 0;
    const backoffMs = 1000; // Start with 1 second backoff
    
    const prompt = `Create a multiple-choice quiz from educational content. Return in valid JSON format.

REQUIRED JSON STRUCTURE:
{
  "questions": [
    {
      "question": "Clear question testing knowledge",
      "options": [
        "First answer option",
        "Second answer option", 
        "Third answer option",
        "Fourth answer option"
      ],
      "correct_option": "Exact match to one of the options above",
      "explanation": "Brief explanation of why this answer is correct",
      "source_reference": "Topic category"
    }
  ]
}

GUIDELINES:
- Generate 10-15 questions covering main topics
- Use clear, standalone questions without referencing the source material
- Include factual, conceptual, and application questions
- Provide plausible wrong options with one clear correct answer
- Give brief, informative explanations
- Avoid phrases like "In this video" or "According to the material"
- Ensure valid JSON that can be parsed with JSON.parse()
- Mix easy, medium, and difficult questions
- Label source_reference by topic (e.g., "Core Concepts", "Applications")
- Create standalone questions that test knowledge, not recall of the material`;


    while (retries <= MAX_RETRIES) {
      try {
        const generateContent = await model.generateContent([prompt, transcripts]);
        const responseText = generateContent.response.text();
        
        // Parse the response using our helper function
        const quizData = parseAiResponse<QuizResponse>(responseText);
        return quizData;
      } catch (error) {
        retries++;
        console.error(`Quiz generation attempt ${retries} failed:`, error);
        
        if (retries <= MAX_RETRIES) {
          // Exponential backoff
          const waitTime = backoffMs * Math.pow(2, retries - 1);
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error('Max retries reached for generateQuiz:', error);
          // Return a fallback quiz when all retries are exhausted
          return {
            quiz: [{
              question: "The AI service is currently unavailable. Which is the most likely reason?",
              options: [
                "The service is experiencing high load",
                "There was an error parsing the response",
                "The system is undergoing maintenance",
                "All of the above"
              ],
              correct_option: "All of the above",
              explanation: "The quiz service is temporarily unavailable due to high demand or service limitations. Please try again later.",
              source_reference: "System Status"
            }]
          };
        }
      }
    }
    
    // This should never be reached because of the fallback in the catch block
    // But TypeScript wants a return statement
    return {
      quiz: []
    };
};

export const generateMindMap = async (transcripts: string): Promise<MindMapData> => {
  // Split transcript into chunks of approximately 1000 words
  const words = transcripts.split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; i += 1000) {
    chunks.push(words.slice(i, i + 1000).join(' '));
  }

  const prompt = `Create a hierarchical mind map from educational content in GoJS-compatible JSON format.

REQUIRED JSON STRUCTURE:
{
  "metadata": {
    "title": "Content Topic Title",
    "total_nodes": 15,
    "max_depth": 3,
    "main_branches": 4
  },
  "nodes": [
    {
      "key": 1,
      "text": "Central Topic",
      "category": "root",
      "level": 1,
      "description": "Brief topic summary"
    },
    {
      "key": 2,
      "text": "Main Branch 1",
      "category": "section",
      "level": 2,
      "parent": 1
    },
    {
      "key": 3,
      "text": "Subtopic A",
      "category": "topic",
      "level": 3,
      "parent": 2
    }
  ],
  "links": [
    {"from": 1, "to": 2, "relationship": "contains"},
    {"from": 2, "to": 3, "relationship": "includes"}
  ]
}

GUIDELINES:
- Create a 3-level hierarchical mind map with 12-18 total nodes
- Level 1: Single central topic (root node, always key: 1)
- Level 2: 3-6 main branches (primary topics)
- Level 3: 2-4 subtopics per main branch
- Use concise node text (2-5 words per node)
- Ensure logical parent-child relationships
- Cover all major topics in the content
- Balance branches evenly
- Use "category" values: "root" (central), "section" (level 2), "topic" (level 3)
- Include relationship types: "contains", "includes", "leads_to", or "relates_to"
- Ensure valid JSON that can be parsed with JSON.parse()`;

  // Import the parseAiResponse helper
  const { parseAiResponse } = await import('./ai-utils');
  
  let finalMindMapData: MindMapData = { nodes: [], links: [], from: -1, to: -1 }; // Adjusted MindMapData type usage
  let nextNodeKeyOffset = 1; // Start with 1, adjust based on max key after each chunk
  let actualRootKey: number | null = null;

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const generateContent = await model.generateContent([prompt, chunk]);
      const responseText = generateContent.response.text();
      
      const chunkData = parseAiResponse<MindMapData>(responseText);

      if (!chunkData || !chunkData.nodes || !chunkData.links) {
        console.warn(`Skipping chunk ${i} due to invalid data format.`);
        continue;
      }
      
      const keyMapping = new Map<number, number>();
      let currentChunkRootOriginalKey: number | null = null;

      // Process nodes from the current chunk
      chunkData.nodes.forEach(node => {
        const originalKey = node.key;
        if (i === 0) { // First chunk
          keyMapping.set(originalKey, originalKey);
          node.key = originalKey; // No offset for the first chunk
          if (node.category === 'root' || originalKey === 1) {
            actualRootKey = originalKey;
          }
        } else { // Subsequent chunks
          const newKey = originalKey + nextNodeKeyOffset;
          keyMapping.set(originalKey, newKey);
          node.key = newKey;
          if (node.category === 'root' || originalKey === 1) { // This was the root of the sub-chunk
            currentChunkRootOriginalKey = originalKey; // Store its *original* key from chunkData
            node.category = 'section'; // Re-categorize as a section branch
          }
        }
      });

      // Add processed nodes to final data, avoiding duplicates by new key
      const existingKeysInFinal = new Set(finalMindMapData.nodes.map(n => n.key));
      chunkData.nodes.forEach(node => {
        if (!existingKeysInFinal.has(node.key)) {
          finalMindMapData.nodes.push(node);
          existingKeysInFinal.add(node.key);
        }
      });
      
      // Process links from the current chunk
      chunkData.links.forEach(link => {
        const newFrom = keyMapping.get(link.from);
        const newTo = keyMapping.get(link.to);
        if (newFrom !== undefined && newTo !== undefined) {
          finalMindMapData.links.push({ from: newFrom, to: newTo });
        }
      });

      // If this is a subsequent chunk and we identified its original root,
      // link it to the actualRootKey of the first chunk.
      if (i > 0 && currentChunkRootOriginalKey !== null && actualRootKey !== null) {
        const mappedChunkRootKey = keyMapping.get(currentChunkRootOriginalKey);
        if (mappedChunkRootKey !== undefined) {
           // Ensure this new main branch node exists in finalMindMapData.nodes
           // (it should have been added in the node processing loop)
           const chunkRootNodeExists = finalMindMapData.nodes.some(n => n.key === mappedChunkRootKey);
           if(chunkRootNodeExists){
            finalMindMapData.links.push({ from: actualRootKey, to: mappedChunkRootKey });
           } else {
             console.warn(`Root node for chunk ${i} (original key ${currentChunkRootOriginalKey}, mapped to ${mappedChunkRootKey}) not found in final nodes. Cannot link to main root.`);
           }
        }
      }
      
      // Update offset for the next chunk based on the maximum key used so far
      if (finalMindMapData.nodes.length > 0) {
        nextNodeKeyOffset = Math.max(...finalMindMapData.nodes.map(n => n.key)) + 100; // Add a buffer
      } else if (chunkData.nodes.length > 0) { // If finalMindMapData was empty, use current chunk's max
        nextNodeKeyOffset = Math.max(...chunkData.nodes.map(n => n.key)) + 100;
      }
    }
    
    // De-duplicate links
    const uniqueLinks = Array.from(new Set(finalMindMapData.links.map(link => JSON.stringify({from: link.from, to: link.to}))))
                          .map(strLink => JSON.parse(strLink) as { from: number; to: number });
    finalMindMapData.links = uniqueLinks;

    if (finalMindMapData.nodes.length === 0) {
      throw new Error('Failed to generate any mind map nodes after processing all chunks.');
    }
    
    return finalMindMapData;
  } catch (error) {
    console.error('Error generating mind map:', error);
    // Fallback to a very simple mind map on error to prevent UI crash
    return {
      nodes: [{ key: 1, text: "Error Generating Mind Map", category: "root" }],
      links: [],
      from: -1, to: -1 // satisfy MindMapData type
    };
  }
};

// Concept Match interfaces and function
interface ConceptMatchPair {
  id: string;
  concept: string;
  definition: string;
}

interface ConceptMatchResponse {
  conceptMatch: ConceptMatchPair[];
}

export const generateConceptMatch = async (transcripts: string): Promise<ConceptMatchResponse> => {
  // Import the parseAiResponse helper
  const { parseAiResponse } = await import('./ai-utils');
  
  const prompt = `Create concept-definition matching pairs from educational content. Return valid JSON only.

REQUIRED JSON STRUCTURE:
{
  "conceptMatch": [
    {
      "id": "1",
      "concept": "Brief concept or term",
      "definition": "Clear, concise definition"
    }
  ]
}

GUIDELINES:
- Generate 6-8 concept-definition pairs covering key topics
- Use clear, concise concepts (1-4 words)
- Provide accurate, very concise definitions (5-12 words maximum)
- Cover the most important terms and concepts
- Include both technical terms and general concepts
- Ensure definitions are very brief but self-contained and clear
- Mix easy, medium, and challenging concepts
- Avoid overly complex or obscure terms
- Ensure valid JSON that can be parsed with JSON.parse()
- Each concept should have a unique, clear definition`;

  try {
    const generateContent = await model.generateContent([prompt, transcripts]);
    const responseText = generateContent.response.text();
    
    // Parse the response using our helper function
    const conceptMatchData = parseAiResponse<ConceptMatchResponse>(responseText);
    return conceptMatchData;
  } catch (error) {
    console.error('Error generating concept match:', error);
    throw new Error('Failed to generate concept match. Please try again.');
  }
};

// Term Builder interfaces and function
interface TermBuilderChain {
  id: string;
  title: string;
  description: string;
  correctChain: string[];
  availableTerms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TermBuilderResponse {
  termBuilder: TermBuilderChain[];
}

export const generateTermBuilder = async (transcripts: string): Promise<TermBuilderResponse> => {
  // Import the parseAiResponse helper
  const { parseAiResponse } = await import('./ai-utils');
  
  const prompt = `Create term building chains from educational content. Return valid JSON only.

REQUIRED JSON STRUCTURE:
{
  "termBuilder": [
    {
      "id": "1",
      "title": "Chain Title",
      "description": "Brief description (15 words max)",
      "correctChain": ["Term1", "Term2", "Term3", "Term4"],
      "availableTerms": ["Term1", "Term2", "Term3", "Term4", "Distractor1", "Distractor2"],
      "difficulty": "easy"
    }
  ]
}

GUIDELINES:
- Generate exactly 3 chains with increasing difficulty (easy, medium, hard)
- Each correct chain should have 4-6 terms in logical sequence
- Include 6-8 available terms (correct terms + 2-4 distractors)
- Distractors should be plausible but incorrect for the sequence
- Chain should show clear logical progression: process steps, cause-effect, chronological order, or hierarchy
- Use clear, concise terms (1-2 words each, 3 words maximum)
- Provide brief descriptions (10-15 words maximum)
- Ensure chains follow understandable logic: temporal sequence, process flow, or conceptual hierarchy
- Cover different aspects of the content with distinct logical patterns
- Easy: obvious chronological or step-by-step sequence
- Medium: requires understanding of relationships or dependencies
- Hard: complex conceptual or hierarchical relationships
- Make sequences that users can reason through logically
- Ensure valid JSON that can be parsed with JSON.parse()`;

  try {
    const generateContent = await model.generateContent([prompt, transcripts]);
    const responseText = generateContent.response.text();
    
    // Parse the response using our helper function
    const termBuilderData = parseAiResponse<TermBuilderResponse>(responseText);
    return termBuilderData;
  } catch (error) {
    console.error('Error generating term builder:', error);
    throw new Error('Failed to generate term builder. Please try again.');
  }
};