import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { YoutubeTranscript } from "youtube-transcript";
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
        const transcript = await YoutubeTranscript.fetchTranscript(video_id, {
            lang: "en",
        });

        if (!transcript || transcript.length === 0) {
            console.error("No transcript data returned for video:", video_id);
            return null;
        }

        const formattedTranscript: transcriptInterface[] = transcript.map(
            (item) => ({
                text: item.text,
                duration: item.duration,
                offset: item.offset,
                lang: item.lang || "en",
            })
        );

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

export const summarizeChunks = async (transcripts: string) => {
    const prompt = `You are an expert content analyzer specializing in creating concise, well-structured summaries from diverse educational materials. Your task is to create a comprehensive overview that transforms any learning content into an accessible format optimized for quick understanding.
IMPORTANT: Return ONLY valid JSON without any markdown formatting or additional text. Do not include code blocks or backticks. The response must be valid JSON that can be parsed with JSON.parse().
Summary Requirements
Target Specifications

Word Count: 600-700 words total
Format: Clean overview suitable for content page display
Audience: General learners seeking quick but comprehensive understanding
Tone: Professional, clear, and accessible

Content Structure
Create a streamlined summary with content-driven sections:

Introduction (100-120 words) - NO HEADING

Main subject and purpose
Key learning objectives
Context and relevance


Dynamic Section Headings (400-450 words total across 2-3 sections)

Create headings based on the actual content topics
Examples: "Machine Learning Fundamentals," "Data Analysis Techniques," "Financial Planning Strategies"
Adapt headings to match the specific subject matter
Include fundamental principles, key concepts, and practical applications


Key Insights (100-120 words)

Most important takeaways
Actionable recommendations
Practical applications



Required JSON Structure
Structure your response exactly as follows:
{
  "sections": [
    {
      "type": "paragraph",
      "content": "Introduction paragraph content - no heading needed"
    },
    {
      "type": "heading", 
      "level": 2,
      "content": "Content-Specific Heading Based on Transcript Topic"
    },
    {
      "type": "paragraph",
      "content": "Content explaining the specific topic from transcript"
    },
    {
      "type": "list_item",
      "content": "Key point related to this topic"
    },
    {
      "type": "heading",
      "level": 2, 
      "content": "Another Topic-Specific Heading from Content"
    },
    {
      "type": "paragraph",
      "content": "More content based on actual transcript material"
    },
    {
      "type": "heading",
      "level": 2,
      "content": "Key Insights"  
    },
    {
      "type": "paragraph",
      "content": "Important takeaways and actionable insights"
    },
    {
      "type": "list_item",
      "content": "Specific actionable takeaway"
    }
  ]
}
  
Content Guidelines
What to Include

Essential Information: Core concepts, key principles, and main topics from the content
Content-Driven Headings: Section titles that reflect the actual subject matter discussed
Practical Value: Real-world applications and actionable insights
Learning Focus: What readers will understand and be able to do
Clear Explanations: Technical terms defined simply
Concrete Examples: Specific illustrations from the source material

What to Exclude

Source-specific references ("In this video," "The document explains")
Excessive technical jargon without explanation
Repetitive or filler content
Complex subsections or nested hierarchies
Promotional language or unnecessary details

Writing Standards

Clarity: Simple, direct sentences that communicate effectively
Conciseness: Every sentence adds value without redundancy
Accessibility: Understandable by diverse learning backgrounds
Completeness: Cover all essential information within word limit
Flow: Logical progression from overview to specific details

Element Types Usage

"paragraph": Start with introduction paragraph (no heading)
"heading" with level 2: Content-driven section headings based on transcript topics

Examples: "Digital Marketing Strategies," "Python Programming Basics," "Investment Portfolio Management"
Create 2-3 headings that reflect the actual content themes


"paragraph": Main explanatory content, definitions, and detailed information
"list_item": Individual key points, takeaways, or important items (use sparingly for emphasis)
Final heading: Always end with "Key Insights" section

Quality Standards
Content Quality

All major topics represented proportionally
Technical accuracy maintained throughout
Examples and applications clearly explained
Practical value evident in every section

Structural Quality

Clean JSON format with proper syntax
Appropriate content distribution across sections
Logical flow from general to specific information
Consistent tone and style throughout

Generate a comprehensive yet concise summary that serves as an effective overview for any learning content, formatted as clean JSON ready for immediate use.`;

    const generateContent = await model.generateContent([prompt, transcripts]);
    return generateContent?.response?.text();
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
    
    const prompt = `You are an expert educational content analyzer specializing in creating effective flashcards from diverse learning materials. Generate structured flashcards in JSON format from the provided content (video transcript, PDF, image, or audio).

IMPORTANT: Return ONLY valid JSON without any markdown formatting or additional text. Do not include code blocks or backticks. The response must be valid JSON that can be parsed with JSON.parse().

Flashcard Creation Guidelines
Content Adaptation Rules:
- Video/Audio Transcripts: Use approximate timestamps (MM:SS format)
- PDF Documents: Use page numbers or section references (e.g., "Page 3", "Section 2.1")
- Images: Use "Image Analysis" or describe the visual element location
- General Content: Use "N/A" when no specific source reference applies

Question Types to Create:
- Factual Questions: Key definitions, terms, concepts
- Conceptual Questions: Understanding relationships and principles
- Application Questions: How to use or apply knowledge
- Process Questions: Step-by-step procedures or workflows
- Comparative Questions: Differences, similarities, pros/cons

Quality Standards:
- Question Clarity: Direct, unambiguous questions
- Strategic Hints: Provide context without revealing answers
- Precise Answers: Complete but concise responses
- Educational Explanations: Add context and deeper understanding
- Balanced Difficulty: Mix easy, medium, and challenging questions

Required JSON Structure:

{
  "flashcards": [
    {
      "question": "Clear, direct question about the topic",
      "hint": "Helpful clue that guides thinking without giving away the answer",
      "answer": "Complete, accurate answer",
      "explanation": "Detailed explanation providing context and deeper understanding",
      "source": "Timestamp (MM:SS), page reference, or N/A"
    }
  ]
}

Content Coverage Requirements:

Generate 8-15 flashcards depending on content complexity
Cover all major topics from the source material
Ensure progressive difficulty from basic to advanced concepts
Include both factual and conceptual questions
Balance memorization and understanding questions

Formatting Rules:

Use proper JSON syntax with correct quotation marks
Escape special characters in text (quotes, backslashes)
Keep questions under 25 words for clarity
Keep hints under 15 words to maintain effectiveness
Keep answers concise but complete (1-2 sentences)
Keep explanations informative but brief (2-3 sentences)

Source Reference Guidelines:
For Videos: "12:45" (approximate timestamp)
For PDFs: "Page 5" or "Section 3.2"
For Images: "Image Analysis" or "Diagram 1"
For Audio: "15:30" (approximate timestamp)
When Uncertain: "N/A"
Generate educational flashcards that promote active recall and deep understanding of the material.


  `;
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
    
    const prompt = `Multi-Source Quiz Generation Prompt

You are an expert educational assessment designer specializing in creating comprehensive multiple-choice quizzes that test understanding, application, and retention of learning materials.

IMPORTANT: Return ONLY valid JSON without any markdown formatting or additional text. Do not include code blocks or backticks. The response must be valid JSON that can be parsed with JSON.parse().

CRITICAL: Generate questions as if they are standalone knowledge assessments. Never reference the source material directly using phrases like "In this video," "According to the document," "The material states," "As mentioned," or similar source-referential language. Questions should read as if they are testing established knowledge rather than content from a specific source.
Quiz Generation Requirements
Question Quantity

    Minimum 10 questions for any content length
    12-15 questions for medium-length content
    15-20 questions for comprehensive content
    Scale proportionally based on content depth and complexity

Question Types Distribution

    Factual Questions (30%): Definitions, terms, specific facts
    Conceptual Questions (30%): Understanding principles and relationships
    Application Questions (25%): How to use knowledge in practice
    Analysis Questions (15%): Compare, contrast, evaluate concepts

Content Coverage Strategy

    Topic Completeness: Cover ALL major topics and subtopics
    Balanced Distribution: Questions spread across entire content
    Key Concept Focus: Emphasize most important learning objectives
    Detail Hierarchy: Mix high-level concepts with specific details

Question Quality Standards
Question Construction

    Clear and Concise: Direct questions without ambiguity
    Appropriate Difficulty: Mix easy (40%), medium (40%), hard (20%) questions
    Knowledge-Based Framing: Present questions as testing established knowledge
    Standalone Clarity: Questions understandable without external context

Option Design

    One Clearly Correct Answer: Unambiguous right choice
    Plausible Distractors: Wrong options that seem reasonable
    Similar Length: All options roughly same word count
    No "All/None of the Above": Use specific, meaningful options

Explanation Requirements

    Concise but Complete: 1-2 sentences explaining why the answer is correct
    Educational Context: Add context that deepens understanding
    Knowledge Integration: Connect concepts without referencing source material
    Common Misconceptions: Address why wrong options might seem appealing

Required JSON Structure:
{
  "questions": [
    {
      "question": "Clear, well-framed question testing knowledge",
      "options": [
        "First answer option",
        "Second answer option", 
        "Third answer option",
        "Fourth answer option"
      ],
      "correct_option": "Exact match to one of the four options above",
      "explanation": "Concise explanation of correct answer with educational context",
      "source_reference": "Topic reference or content area identifier"
    }
  ]
}
  
Source Reference Format
Instead of referencing the source material directly, use topic-based references:

Topic Areas: "Fundamentals," "Advanced Concepts," "Applications"
Subject Categories: "Theory," "Practice," "Analysis"
Content Sections: "Core Principles," "Case Studies," "Methods"
Knowledge Domains: Relevant subject area or skill category

Question Framing Examples
❌ Avoid These Phrasings:

"According to the video..."
"In this document..."
"The material explains..."
"As mentioned in the content..."
"The source states..."

✅ Use These Phrasings Instead:

"What is the primary purpose of..."
"Which method is most effective for..."
"How does X relate to Y..."
"What are the key characteristics of..."
"Which statement best describes..."

Quality Assurance Checklist

 All major topics covered with appropriate question distribution
 Question difficulty appropriately varied across the quiz
 All options are plausible and grammatically consistent
 No source-referential language used in questions
 Explanations enhance learning without being repetitive
 Source references use topic-based identifiers
 JSON format is valid and properly structured

Advanced Question Techniques

Scenario-Based: Present realistic situations requiring knowledge application
Sequential Logic: Questions that build on previous concepts
Process Understanding: Test step-by-step procedures and workflows
Critical Thinking: Questions requiring analysis and evaluation
Knowledge Synthesis: Combine multiple concepts in single questions

Generate a comprehensive quiz that effectively assesses learner understanding and promotes knowledge retention while maintaining the illusion that questions test established knowledge rather than specific source material.`;


    const generateContent = await model.generateContent([prompt, transcripts]);
    const responseText = generateContent.response.text();
    
    try {
      // Parse the response using our helper function
      const quizData = parseAiResponse<QuizResponse>(responseText);
      return quizData;
    } catch (error) {
      console.error('Error parsing quiz response:', error);
      console.error('Raw response:', responseText);
      throw new Error('Failed to generate quiz. The AI response format was invalid.');
    }
};

export const generateMindMap = async (transcripts: string): Promise<MindMapData> => {
  // Split transcript into chunks of approximately 1000 words
  const words = transcripts.split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; i += 1000) {
    chunks.push(words.slice(i, i + 1000).join(' '));
  }

    const prompt = `You are an expert knowledge visualization specialist designed to generate hierarchical mind maps from diverse educational content. Create visually optimized, well-structured mind maps that effectively represent the conceptual architecture of any learning material.
Content Analysis Guidelines
Video/Audio Transcripts: Focus on main talking points, repeated concepts, and logical presentation flow
PDF Documents: Extract from headings, subheadings, bullet points, and document structure
Images/Diagrams: Interpret visual hierarchies, flowcharts, and organizational elements
General Content: Identify core concepts and their natural relationships
Mind Map Structure Requirements
Hierarchical Design:

Level 1 (Root): Single central topic representing the main subject
Level 2 (Main Branches): 3-6 primary topic areas
Level 3 (Sub-branches): 2-4 subtopics per main branch
Maximum Depth: 3 levels to maintain clarity and readability

Node Optimization:

Root Node: 2-4 words capturing the core subject
Main Branch Nodes: 3-5 words per topic area
Sub-branch Nodes: 2-4 words for specific concepts
Total Node Count: 12-18 nodes for optimal performance and comprehension

Content Prioritization Strategy:

Identify Core Themes: Extract 3-6 main topic categories
Group Related Concepts: Cluster subtopics under appropriate themes
Eliminate Redundancy: Merge similar concepts into single nodes
Focus on Key Ideas: Include only essential concepts, not minor details
Maintain Balance: Distribute subtopics evenly across main branches

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
      "category": "main",
      "level": 2,
      "parent": 1
    },
    {
      "key": 3,
      "text": "Subtopic A",
      "category": "sub",
      "level": 3,
      "parent": 2
    }
  ],
  "links": [
    {"from": 1, "to": 2, "relationship": "contains"},
    {"from": 2, "to": 3, "relationship": "includes"}
  ]
}
  

Visual Organization Principles
Balanced Tree Structure:

Symmetrical Distribution: Spread main branches evenly
Logical Grouping: Related concepts under same parent
Progressive Specificity: General to specific from center outward
Visual Weight Balance: Similar number of subtopics per main branch

Node Category System:

"root": Central topic (always key: 1)
"main": Primary topic areas (level 2)
"sub": Specific concepts (level 3)
"highlight": Critical concepts requiring emphasis

Relationship Mapping:

"contains": Parent encompasses child concept
"includes": Parent includes child as component
"leads_to": Sequential or causal relationship
"relates_to": Conceptual connection

Content Extraction Strategy
Topic Identification Process:

Scan for Major Themes: Identify 3-6 primary subject areas
Extract Key Concepts: Find 2-4 important subtopics per theme
Eliminate Minor Details: Focus on concepts, not examples or specifics
Verify Relationships: Ensure logical parent-child connections
Optimize Text Length: Condense to essential keywords

Quality Validation:

Completeness: All major topics represented
Clarity: Node text is immediately understandable
Hierarchy: Clear parent-child relationships
Balance: Even distribution across branches
Conciseness: No unnecessary complexity

Performance Optimization
Node Efficiency:

Target Range: 12-18 total nodes
Branch Balance: 3-6 main branches with 2-4 subtopics each
Text Optimization: Maximum 7 words per node
Depth Control: Never exceed 3 levels

JSON Optimization:

Clean Structure: Valid JSON with consistent formatting
Minimal Metadata: Only essential information included
Sequential Keys: Numbered consecutively starting from 1
Efficient Links: Direct parent-child connections only

Advanced Mind Map Features
Enhanced Categorization:
"category": "root|main|sub|highlight|process|concept"

Priority Indicators:
"priority": "high|medium|low"

Concept Relationships:
"relationships": ["sequential", "hierarchical", "conceptual", "causal"]


Output Requirements
Generate a GoJS-compatible JSON mind map that:

Represents the content's conceptual structure accurately
Maintains visual clarity and balance
Uses concise, meaningful node labels
Creates logical hierarchical relationships
Optimizes for both comprehension and performance
Works seamlessly across all content types (video, PDF, image, audio)

Target Output: A clean, balanced mind map JSON structure ready for immediate visualization in GoJS framework.
`;



  // Import the parseAiResponse helper
  const { parseAiResponse } = await import('./ai-utils');
  
  // Process chunks sequentially
  let mindMapData: MindMapData | null = null;
  
  try {
    for (const chunk of chunks) {
      const generateContent = await model.generateContent([prompt, chunk]);
      const responseText = generateContent.response.text();
      
      // Parse the response using our helper function
      const chunkData = parseAiResponse<MindMapData>(responseText);
      
      if (!mindMapData) {
        mindMapData = chunkData;
      } else {
        // Merge new nodes and links, avoiding duplicates
        const existingKeys = new Set(mindMapData.nodes.map((n: MindMapNode) => n.key));
        const newNodes = chunkData.nodes.filter((n: MindMapNode) => !existingKeys.has(n.key));
        mindMapData.nodes.push(...newNodes);
        mindMapData.links.push(...chunkData.links);
      }
    }
    
    if (!mindMapData) {
      throw new Error('Failed to generate mind map data');
    }
    
    return mindMapData;
  } catch (error) {
    console.error('Error generating mind map:', error);
    throw new Error('Failed to generate mind map. Please try again.');
  }
};