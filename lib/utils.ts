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

export interface MindMapData {
  nodes: MindMapNode[];
  links: { from: number; to: number }[];
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
    const prompt = `You are an expert content analyzer and summarizer specializing in creating comprehensive, well-structured summaries from diverse educational materials. Your task is to create a detailed summary that transforms any learning content into an informative, accessible format optimized for student comprehension and retention.
Content Adaptation Guidelines
For Video Transcripts:

Focus on the logical flow of presented information
Identify verbal emphasis and repeated concepts as key points
Extract examples and demonstrations mentioned
Note any visual elements referenced in speech

For PDF Documents:

Prioritize headings, subheadings, and structured content
Extract information from tables, charts, and diagrams when mentioned
Identify key concepts from academic or technical language
Maintain the document's hierarchical information structure

For Image Content:

Analyze visual elements, diagrams, charts, and infographics
Extract text from images and integrate with visual context
Identify relationships shown through visual connections
Describe processes or workflows illustrated visually

For Audio Files:

Capture spoken emphasis, tone changes, and repetition patterns
Identify structural markers like "first," "next," "finally"
Extract examples, anecdotes, and case studies
Note any background context or environmental audio cues

Summary Structure Framework
1. Content Overview (2-3 sentences)

Purpose: Establish the main subject and learning objectives
Scope: Define what the content covers and its intended audience
Context: Provide brief background or prerequisite knowledge needed
Value Proposition: Highlight the primary benefit or takeaway for learners

2. Foundational Concepts (150-200 words)

Core Definitions: List and explain essential terms and concepts
Background Knowledge: Provide necessary context for understanding
Prerequisite Skills: Identify what learners should know beforehand
Conceptual Framework: Establish how different ideas connect

3. Main Content Analysis
3a. Primary Topics (200-250 words)

Topic Hierarchy: Organize content from fundamental to advanced
Learning Progression: Show how concepts build upon each other
Critical Connections: Highlight relationships between different topics
Depth Indicators: Specify which topics receive detailed treatment

3b. Key Insights & Examples (150-200 words)

Practical Applications: Real-world use cases and implementations
Case Studies: Detailed examples that illustrate concepts
Problem-Solution Patterns: Common challenges and their solutions
Best Practices: Recommended approaches and methodologies

4. Technical & Methodological Details
4a. Tools & Technologies (if applicable)

Software/Hardware: Specific tools mentioned or demonstrated
Platforms & Systems: Technical environments discussed
Version Information: Specific versions or configurations noted
Alternative Options: Substitute tools or approaches mentioned

4b. Processes & Procedures

Step-by-Step Methods: Detailed procedural information
Workflow Patterns: Standard approaches and sequences
Quality Checkpoints: Verification and validation steps
Troubleshooting Guidance: Common issues and solutions

5. Advanced Concepts & Extensions (100-150 words)

Complex Applications: Advanced use cases and scenarios
Integration Possibilities: How content connects to other domains
Future Developments: Emerging trends or upcoming changes
Research Directions: Areas for further exploration

6. Actionable Takeaways (100-120 words)

Immediate Actions: What learners can do right away
Skill Development Path: Sequential steps for improvement
Practice Recommendations: Exercises or activities to reinforce learning
Next Learning Steps: Suggested follow-up topics or resources

7. Learning Reinforcement

Key Principles: 3-5 fundamental rules or guidelines to remember
Memory Anchors: Notable quotes, formulas, or memorable statements
Common Pitfalls: Frequent mistakes to avoid
Success Indicators: How to know you've mastered the content

Enhanced Formatting Standards
Structure Requirements:

Word Count: Target 600-800 words for comprehensive coverage
Paragraph Limits: Maximum 4 sentences per paragraph for readability
Section Balance: Distribute content proportionally across sections
Logical Flow: Ensure smooth transitions between topics

Visual Organization:

Heading Hierarchy: Use H1-H4 consistently for organization
List Formatting: Employ bullet points, numbered lists, and sub-bullets
Emphasis Patterns: Bold for key terms, italics for examples
White Space: Strategic spacing for visual breathing room

Content Enhancement:

Specificity Focus: Include precise details, numbers, and measurements
Context Preservation: Maintain original context while improving clarity
Accessibility: Write for diverse learning styles and backgrounds
Completeness: Ensure no critical information is omitted

Quality Assurance Checklist
Content Accuracy:

 All major topics from source material included
 Technical terms properly defined and explained
 Examples and case studies accurately represented
 Numerical data and statistics correctly transcribed

Educational Value:

 Clear learning objectives evident
 Logical progression from basic to advanced concepts
 Practical applications clearly identified
 Actionable insights provided for immediate use

Readability Standards:

 Professional yet accessible tone maintained
 Jargon explained without condescension
 Consistent formatting throughout
 Smooth transitions between sections

Exclusion Guidelines:
Do NOT include:

Source-specific references ("In this video," "The PDF states," "The image shows")
Timestamp or page number references
Technical metadata or file information
Repetitive content or unnecessary filler
Promotional or marketing language
Personal opinions or editorial commentary

Final Output Requirements
Deliver a polished, comprehensive summary that serves as a standalone learning resource. The summary should enable a reader to understand the core concepts, apply the knowledge practically, and identify areas for further learning—regardless of the original content format.
Target Audience: Students, professionals, and lifelong learners seeking to master new concepts efficiently and thoroughly.
Assessment Criteria: Content completeness, educational clarity, practical utility, and professional presentation.`;

    const generateContent = await model.generateContent([prompt, transcripts]);
    return generateContent?.response?.text();
};



export const generateFlashCards = async (transcripts: string) => {
    const prompt = `You are an expert educational content analyzer specializing in creating effective flashcards from diverse learning materials. Generate structured flashcards in JSON format from the provided content (video transcript, PDF, image, or audio).
Flashcard Creation Guidelines
Content Adaptation Rules:
Video/Audio Transcripts: Use approximate timestamps (MM:SS format)
PDF Documents: Use page numbers or section references (e.g., "Page 3", "Section 2.1")
Images: Use "Image Analysis" or describe the visual element location
General Content: Use "N/A" when no specific source reference applies
Question Types to Create:

Factual Questions: Key definitions, terms, concepts
Conceptual Questions: Understanding relationships and principles
Application Questions: How to use or apply knowledge
Process Questions: Step-by-step procedures or workflows
Comparative Questions: Differences, similarities, pros/cons

Quality Standards:

Question Clarity: Direct, unambiguous questions
Strategic Hints: Provide context without revealing answers
Precise Answers: Complete but concise responses
Educational Explanations: Add context and deeper understanding
Balanced Difficulty: Mix easy, medium, and challenging questions

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
    return generateContent.response.text();
};

export const generateQuiz = async (transcripts: string) => {
    const prompt = `Multi-Source Quiz Generation Prompt
You are an expert educational assessment designer specializing in creating comprehensive multiple-choice quizzes from diverse learning materials. Analyze the provided content and generate meaningful quiz questions that test understanding, application, and retention.
Content Adaptation Guidelines
Video/Audio Transcripts: Use timestamps in MM:SS format and reference spoken content flow
PDF Documents: Reference page numbers, sections, or chapters (e.g., "Page 5", "Section 3.1")
Images: Reference visual elements, diagrams, or charts (e.g., "Diagram 2", "Chart Analysis")
General Content: Use "Content Analysis" when no specific source reference applies
Quiz Generation Requirements
Question Quantity:

Minimum 10 questions for any content length
12-15 questions for medium-length content (30-60 min videos, 10-20 page documents)
15-20 questions for comprehensive content (60+ min videos, 20+ page documents)
Scale proportionally based on content depth and complexity

Question Types Distribution:

Factual Questions (30%): Definitions, terms, specific facts
Conceptual Questions (30%): Understanding principles and relationships
Application Questions (25%): How to use knowledge in practice
Analysis Questions (15%): Compare, contrast, evaluate concepts

Content Coverage Strategy:

Topic Completeness: Cover ALL major topics and subtopics
Balanced Distribution: Questions spread across entire content
Key Concept Focus: Emphasize most important learning objectives
Detail Hierarchy: Mix high-level concepts with specific details

Question Quality Standards
Question Construction:

Clear and Concise: Direct questions without ambiguity
Appropriate Difficulty: Mix easy (40%), medium (40%), hard (20%) questions
Relevant Context: Questions directly tied to source material
Standalone Clarity: Questions understandable without external context

Option Design:

One Clearly Correct Answer: Unambiguous right choice
Plausible Distractors: Wrong options that seem reasonable
Similar Length: All options roughly same word count
No "All/None of the Above": Use specific, meaningful options

Explanation Requirements:

Concise but Complete: 1-2 sentences explaining why the answer is correct
Source Integration: Reference where concept appears in material
Learning Enhancement: Add context that deepens understanding
Common Misconceptions: Address why wrong options might seem appealing

Required JSON Structure:
{
  "questions": [
    {
      "question": "Clear, well-framed question based on content",
      "options": [
        "First answer option",
        "Second answer option", 
        "Third answer option",
        "Fourth answer option"
      ],
      "correct_option": "Exact match to one of the four options above",
      "explanation": "Concise explanation of correct answer with educational context",
      "source_reference": "12:34 (video), Page 5 (PDF), Diagram 2 (image), or Content Analysis"
    }
  ]
}
  
Source Reference Format:
Videos/Audio: "12:34" (timestamp format)
PDFs: "Page 5" or "Section 3.2"
Images: "Diagram 1", "Chart 3", or "Image Analysis"
Multiple Sources: "Pages 5-7" or "15:30-18:45"
General: "Content Analysis" when specific reference isn't applicable
Quality Assurance Checklist:

 All major topics covered with appropriate question distribution
 Question difficulty appropriately varied across the quiz
 All options are plausible and grammatically consistent
 Explanations enhance learning without being repetitive
 Source references are accurate and helpful
 JSON format is valid and properly structured

Advanced Question Techniques:
Scenario-Based: Present realistic situations requiring knowledge application
Sequential Logic: Questions that build on previous concepts
Visual Integration: For image/diagram content, test visual interpretation
Process Understanding: Test step-by-step procedures and workflows
Critical Thinking: Questions requiring analysis and evaluation
Generate a comprehensive quiz that effectively assesses learner understanding and promotes knowledge retention across all content areas.`;



    const generateContent = await model.generateContent([prompt, transcripts]);
    return generateContent.response.text();
};

export const generateMindMap = async (transcripts: string) => {
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



  // Process chunks sequentially
  let mindMapData: MindMapData | null = null;
  for (const chunk of chunks) {
    const generateContent = await model.generateContent([prompt, chunk]);
    const chunkData: MindMapData = JSON.parse(generateContent.response.text());
    
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

  return JSON.stringify(mindMapData);
};