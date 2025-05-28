import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { YoutubeTranscript } from "youtube-transcript";
import { Pinecone, Index } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Add model configuration
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const FALLBACK_MODEL = 'sentence-transformers/all-mpnet-base-v2';

// Add helper function for model fallback
// (Assume embedding is still needed for non-chat features)
async function getEmbedding(text: string, modelName: string): Promise<number[]> {
    try {
        // Use a public API or fallback logic if needed
        // ...existing code for non-chat embedding...
        return [];
    } catch (error) {
        if (modelName === EMBEDDING_MODEL) {
            return getEmbedding(text, FALLBACK_MODEL);
        }
        throw error;
    }
}

export interface transcriptInterface {
    text: string;
    duration: number;
    offset: number;
    lang: string;
}

interface ChunkData {
    id: string;
    video_id: string;
    text: string;
    startTime: number;
    endTime: number;
    vector: number[];
}

interface PineconeVector {
    id: string;
    values: number[];
    metadata: {
        video_id: string;
        text: string;
        startTime: number;
        endTime: number;
    };
}

interface MindMapNode {
  key: number;
  text: string;
  category?: string;
}

interface MindMapData {
  nodes: MindMapNode[];
  links: { from: number; to: number }[];
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function fetchTranscript2(video_id: string): Promise<transcriptInterface[] | null> {
    try {
        const response = await axios.post("https://lucky-limit-c396.lokeshkhabiya0011.workers.dev/api/transcript", {video_id: video_id});
        const transcripts = response?.data as transcriptInterface[];
        return transcripts;
    } catch (transcriptError: unknown) {
        console.error("Error fetching transcript for video:", video_id);
        console.error("Error details:", transcriptError instanceof Error ? transcriptError.message : transcriptError);
        return null;
    }
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

export const initializePinecone = async () => {
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
    });

    // await pinecone.init({
    //   environment: "YOUR_ENVIRONMENT", // Replace with your Pinecone environment
    //   apiKey: "YOUR_API_KEY", // Replace with your Pinecone API key
    // });
    return pinecone.Index("youtube-content");
};
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

export const generateEmbeddings = async (
    chunks: { text: string; startTime: number | null; endTime: number | null }[],
    video_id: string
) => {
    const results = [];
    for (const [i, chunk] of chunks.entries()) {
        try {
            const embedding = await getEmbedding(chunk.text, EMBEDDING_MODEL);
            results.push({
                id: `${video_id}-chunk-${i}`,
                video_id: video_id,
                text: chunk.text,
                startTime: chunk.startTime,
                endTime: chunk.endTime,
                vector: embedding,
            } as ChunkData);
        } catch (error) {
            console.error(`Error generating embedding for chunk ${i}:`, error);
        }
    }
    return results;
};

export const upsertChunksToPinecone = async (index: Index, chunks: ChunkData[]) => {
    // Ensure vectors is an array and matches Pinecone's expected format
    const vectors: PineconeVector[] = chunks.map((chunk) => ({
        id: chunk.id,
        values: Array.from(chunk.vector), // Convert to regular array if it's not already
        metadata: {
            video_id: chunk.video_id,
            text: chunk.text,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
        },
    }));

    // Upsert in batches of 100 to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
        try {
            const batch = vectors.slice(i, i + batchSize);
            await index.namespace("videosage-namespace-2").upsert(batch);
        } catch (error) {
            console.error(`Error upserting batch starting at index ${i}:`, error);
        }
    }
};

export const summarizeChunks = async (transcripts: string) => {
    const prompt = `You are an expert content summarizer specializing in creating comprehensive, well-structured video summaries. Create a detailed summary of this YouTube video transcript that is both informative and easy to read.

    **Summary Structure:**

    1. **Overview** (2-3 sentences)
    - Provide a concise introduction to the main topic/purpose
    - Highlight the key takeaway

    2. **Key Topics Covered**
    - Break down major topics into clear sections
    - Use bullet points for important subtopics
    - Maintain logical flow from basic to advanced concepts

    3. **Main Points & Insights**
    - Present detailed explanations of core concepts
    - Include any significant examples or case studies
    - Highlight practical applications or recommendations

    4. **Technical Details** (if applicable)
    - List any tools, technologies, or methodologies discussed
    - Include specific steps, processes, or implementations
    - Note any best practices or guidelines mentioned

    5. **Key Takeaways**
    - Summarize 3-5 most important learnings
    - Include any concluding thoughts or recommendations

    **Formatting Guidelines:**
    * Use clear headings and subheadings
    * Implement proper spacing between sections
    * Use bullet points and numbered lists for better readability
    * Keep paragraphs concise (3-4 sentences maximum)
    * Bold important terms or concepts
    * Use markdown formatting for better structure

    **Important Notes:**
    * Aim for approximately 500-700 words
    * Focus on accuracy and completeness
    * Maintain a professional, educational tone
    * Avoid repetition and filler content
    * Do not include timestamps or references to the video format
    * Do not use introductory phrases like "In this video" or "The speaker discusses"

    Please provide a clear, comprehensive summary following these guidelines.`;

    const generateContent = await model.generateContent([prompt, transcripts]);
    return generateContent?.response?.text();
};

export const generateFlashCards = async (transcripts: string) => {
    const prompt = `You are an AI assistant trained to generate flashcards from youtube transcripts for educational purposes. Your task is to create structured flashcards in JSON format with the following fields:

                  1. **Question**: A clear and concise question about the topic.
                  2. **Hint**: A helpful clue or additional information to assist in answering the question.
                  3. **Answer**: The correct and precise answer to the question.
                  4. **Explanation**: A brief but detailed explanation of the answer for better understanding.
                  5. **Source**: The approximate timestamp of the relevant video or material, represented in the format "MM:SS" (e.g., 12:45).

                  Follow these rules:
                  - Ensure all fields are present for each flashcard.
                  - Keep the format machine-readable (JSON).
                  - The "Hint" should not reveal the full answer but give helpful context.
                  - The "Source" must be approximate, and if no video is referenced, mention "N/A."

                  Here is an example of the required output structure:
                  {
                    "flashcards": [
                      {
                        "question": "What is supervised learning in Machine Learning?",
                        "hint": "It involves labeled data.",
                        "answer": "A type of machine learning where the model is trained on labeled data to make predictions.",
                        "explanation": "Supervised learning uses input-output pairs to teach the model how to predict outcomes based on labeled examples.",
                        "source": "08:30"
                      },
                      {
                        "question": "What does 'OOP' stand for in programming?",
                        "hint": "It's related to a paradigm focusing on 'objects.'",
                        "answer": "Object-Oriented Programming.",
                        "explanation": "OOP is a programming paradigm based on the concept of objects containing data and methods for data manipulation.",
                        "source": "N/A"
                      }
                    ]
                  }
                  Always format your response in JSON for consistency.
  `;
    const generateContent = await model.generateContent([prompt, transcripts]);
    return generateContent.response.text();
};

export const generateQuiz = async (transcripts: string) => {
    const prompt = `You are an intelligent assistant trained to generate multiple-choice quizzes from YouTube video transcripts. Your task is to analyze the content of the transcript and create meaningful quiz questions for important topics covered in the video. There should be aleast 10 question. Generate more if transcript is long. Ensure every important topic / knowledge is covered.
                Each quiz entry must include the following:
                1. **Question**: A well-framed question based on the content.
                2. **Options**: Four answer options, with only one being correct.
                3. **Correct Option**: The correct answer to the question.
                4. **Explanation with Timestamp**: A concise explanation of the answer, including the approximate timestamp (in mm:ss format) from the transcript where this topic is discussed.

                Ensure that the content is:
                - Structured in a machine-readable JSON format.
                - Accurate and contextually relevant to the video content.
                - Succinct but informative, especially in the explanation.

                Here is the required JSON format for the output:
                {
                  "questions": [
                    {
                      "question": "What is the primary purpose of reinforcement learning?",
                      "options": [
                        "To mimic human reasoning",
                        "To find patterns in data", 
                        "To optimize decision-making through trial and error",
                        "To classify images"
                      ],
                      "correct_option": "To optimize decision-making through trial and error",
                      "explanation": "Reinforcement learning focuses on training an agent to make decisions in an environment to maximize cumulative reward. Discussed at 12:34 in the transcript.",
                      "timestamp": "12:34"
                    }
                  ]
                }`;
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

  const prompt = `You are an AI designed to generate hierarchical mind maps from YouTube transcripts. Create a concise, well-structured mind map that captures the main topics and key points.

  Requirements:
  1. Focus on main topics and their direct subtopics (max 2 levels deep)
  2. Keep node text concise (max 5-7 words per node)
  3. Use clear, hierarchical relationships
  4. Output in GoJS-compatible JSON format with nodes and links arrays
  5. Limit total nodes to 15-20 for better performance

  JSON Structure:
  {
    "nodes": [
      {"key": 1, "text": "Main Topic", "category": "root"},
      {"key": 2, "text": "Subtopic 1", "category": "section"},
      ...
    ],
    "links": [
      {"from": 1, "to": 2},
      ...
    ]
  }`;

  // Process chunks sequentially
  let mindMapData: MindMapData | null = null;
  for (const chunk of chunks) {
    const generateContent = await model.generateContent([prompt, chunk]);
    const text = generateContent.response.text();
    // Remove markdown formatting if present
    const jsonStr = text.replace(/^```json\n|\n```$/g, '').trim();
    const chunkData: MindMapData = JSON.parse(jsonStr);
    
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

export async function queryPineconeVectorStore(
    client: Pinecone,
    indexname: string,
    namespace: string, 
    video_id: string,
    searchQuery: string
): Promise<string> {
    
    try {
        const queryEmbedding = await getEmbedding(searchQuery, EMBEDDING_MODEL);
        const index = client.index(indexname);
        const queryResponse = await index.namespace(namespace).query({
            topK: 5,
            vector: queryEmbedding,
            includeMetadata: true,
            includeValues: false,
            filter: {
                video_id: { "$eq": video_id },
            },
        });
        
        if (queryResponse.matches.length > 0) {
            const concatRetrievals = queryResponse.matches.map((match, idx) => {
                return `\n Transcript chunks findings ${idx + 1}: \n ${match.metadata?.text} \n chunk timestamp startTime: ${match.metadata?.startTime} & endTime: ${match.metadata?.endTime}`
            }).join(`\n\n`)
            return concatRetrievals
        } else {
            return "<no match>";
        }
    } catch (error) {
        console.error("[HF DEBUG] featureExtraction error", error);
        return "<Error retrieving context. Proceeding with general knowledge.>";
    }
}
