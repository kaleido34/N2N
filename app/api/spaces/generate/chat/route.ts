import { Message } from "ai/react";
import { NextRequest } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { queryPineconeVectorStore } from "@/lib/utils";
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

const google = createGoogleGenerativeAI({
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: process.env.GEMINI_API_KEY
})

const model = google.languageModel("gemini-1.5-flash")

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })

export async function POST(req: NextRequest) {
    try {
        const reqBody = await req.json();
        const video_id = reqBody.data?.video_id;
        const text = reqBody.data?.text;
        const messages = reqBody.messages;

        if (!video_id && !text) {
            throw new Error("Missing video_id or text in request data");
        }

        const userQuestion = messages[messages.length - 1].content;
        let retrievals = "";
        if (text) {
            // For document lessons, use the text as context
            retrievals = text;
        } else {
            try {
                // Simplified search query
                const searchQuery = userQuestion;
                retrievals = await queryPineconeVectorStore(pc, "youtube-content", "videosage-namespace-2", video_id, searchQuery);
            } catch (retrievalError) {
                console.error("Error retrieving context:", retrievalError);
                retrievals = "<Error retrieving context. Proceeding with general knowledge.>";
            }
        }

        // final prompt to gemini api
        const finalPrompt = `You are a helpful and informative assistant designed to answer questions about YouTube videos or documents. You will be provided with:\n\n1. **The user's question:** (This will be dynamically inserted.)\n2. **Contextual information retrieved from the video's transcript, metadata, or document text:** (This will be dynamically inserted as relevant chunks from the vector database or document.)\n\nYour goal is to provide a structured, accurate, and helpful answer to the user's question, drawing information from the provided context.\n\n**Important Instructions:**\n\n* **Structure your response in a clear, organized manner using appropriate headings and bullet points when applicable.**\n* **When citing information, include ONLY the start timestamp in [MM:SS] format (e.g., [12:34]) if available. Do not use time ranges. Don't Forget colons between MM and SS**\n* **If the context doesn't fully cover the topic, supplement with accurate information while maintaining a cohesive response.**\n* **Focus on delivering comprehensive information in a well-structured format.**\n* **For technical or complex topics:**\n    - Break down concepts into clear sections\n    - Use bullet points for lists of principles, steps, or features\n    - Include examples where appropriate\n    - Maintain a logical flow from basic to advanced concepts\n* **Be thorough yet concise - avoid unnecessary words or repetition.**\n* **Do not include phrases like \"according to the transcript\" or \"based on the context.\"**\n* **Do not include conversational elements or statements about your capabilities.**\n\n**Context:**\n\nUser Question: ${userQuestion}\n\nReference Context:\n${retrievals}\n\nPrevious Messages:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nProvide a well-structured, informative response that thoroughly addresses the question.`;

        // stream response from gemini 
        const result = await streamText({
            model: model,
            prompt: finalPrompt
        });

        return result.toDataStreamResponse();
    } catch (error) {
        console.error("Error in chat API:", error);
        // Return a proper error response
        return new Response(
            JSON.stringify({ 
                error: "Failed to process chat request", 
                details: error instanceof Error ? error.message : String(error) 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}