import { HfInference } from "@huggingface/inference";
import axios from "axios";

const hf = new HfInference(process.env.HF_TOKEN!);

// Use models that are more likely to be available
export const EMBEDDING_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
export const FALLBACK_MODEL = 'BAAI/bge-small-en-v1.5';

// Expected vector dimension for Pinecone (based on error message)
const EXPECTED_DIMENSION = 1024;

/**
 * Generate embeddings for a given text using Hugging Face models
 * @param text - The text to generate embeddings for
 * @param modelName - The model to use for generating embeddings
 * @returns Array of numbers representing the embedding
 */
export async function getEmbedding(text: string, modelName: string, opts?: { forceLocal?: boolean }): Promise<number[]> {
    // Use local server for chat (when forceLocal is true)
    if (opts?.forceLocal) {
        try {
            const response = await axios.post("http://localhost:5005/embed", { inputs: [text] });
            // MiniLM-L12-v2 returns 384-dim vectors
            const data = response.data as { embeddings: number[][] };
            return data.embeddings[0];
        } catch (err) {
            console.error("Local embedding server error:", err);
            // Fallback: return zero embedding (384 dims for MiniLM)
            return Array(384).fill(0);
        }
    }
    
    try {
        console.log(`[HF DEBUG] Attempting to get embedding with model: ${modelName}`);
        
        // Ensure we have a valid HF token
        if (!process.env.HF_TOKEN) {
            console.error("Missing HF_TOKEN environment variable");
            throw new Error("Missing Hugging Face API token");
        }
        
        const embedding = await hf.featureExtraction({
            model: modelName,
            inputs: text
        });
        
        // Ensure we're getting a flat array of numbers
        const flatEmbedding = Array.from(embedding).flat(2) as number[];
        console.log(`[HF DEBUG] Successfully got embedding with ${flatEmbedding.length} dimensions`);
        return flatEmbedding;
    } catch (error) {
        console.error(`Error with model ${modelName}:`, error);
        
        if (modelName === EMBEDDING_MODEL) {
            console.log("Attempting fallback model...");
            return getEmbedding(text, FALLBACK_MODEL);
        } else if (modelName === FALLBACK_MODEL) {
            // If both models fail, return a dummy embedding with the correct dimension
            console.log("All embedding models failed. Using fallback zero embedding");
            return new Array(EXPECTED_DIMENSION).fill(0); // Using the expected dimension from error message
        }
        
        throw error;
    }
}

/**
 * Query the Pinecone vector store using the generated embeddings
 */
export async function queryPineconeVectorStore(
    client: any,
    indexname: string,
    namespace: string, 
    video_id: string,
    searchQuery: string,
    opts?: { forceLocal?: boolean }
): Promise<string> {
    console.log("[HF DEBUG] About to call featureExtraction", {
      model: EMBEDDING_MODEL,
      token: process.env.HF_TOKEN ? 'present' : 'missing',
      searchQuery
    });
    try {
        // Use local embedding server for chat if opts.forceLocal is true
        const queryEmbedding = opts?.forceLocal
            ? await getEmbedding(searchQuery, EMBEDDING_MODEL, { forceLocal: true })
            : await getEmbedding(searchQuery, EMBEDDING_MODEL);
        
        // Log the dimension to verify
        console.log(`[HF DEBUG] Vector dimension: ${queryEmbedding.length}`);
        
        // Ensure the vector has the expected dimension
        if (queryEmbedding.length !== EXPECTED_DIMENSION) {
            console.log(`[HF DEBUG] Resizing vector from ${queryEmbedding.length} to ${EXPECTED_DIMENSION}`);
            
            // Resize the vector to match the expected dimension
            if (queryEmbedding.length < EXPECTED_DIMENSION) {
                // If smaller, pad with zeros
                const paddedEmbedding = [...queryEmbedding];
                while (paddedEmbedding.length < EXPECTED_DIMENSION) {
                    paddedEmbedding.push(0);
                }
                
                // Use the padded embedding
                const index = client.index(indexname);
                const queryResponse = await index.namespace(namespace).query({
                    topK: 5,
                    vector: paddedEmbedding,
                    includeMetadata: true,
                    includeValues: false,
                    filter: {
                        video_id: { "$eq": video_id },
                    },
                });
                
                return processQueryResponse(queryResponse);
            } else {
                // If larger, truncate
                const truncatedEmbedding = queryEmbedding.slice(0, EXPECTED_DIMENSION);
                
                // Use the truncated embedding
                const index = client.index(indexname);
                const queryResponse = await index.namespace(namespace).query({
                    topK: 5,
                    vector: truncatedEmbedding,
                    includeMetadata: true,
                    includeValues: false,
                    filter: {
                        video_id: { "$eq": video_id },
                    },
                });
                
                return processQueryResponse(queryResponse);
            }
        }
        
        // Original query with correctly sized vector
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
        
        return processQueryResponse(queryResponse);
    } catch (error) {
        console.error("[HF DEBUG] featureExtraction error", error);
        return "<Error retrieving context. Proceeding with general knowledge.>";
    }
}

// Helper function to process query responses
function processQueryResponse(queryResponse: any): string {
    if (queryResponse.matches && queryResponse.matches.length > 0) {
        const concatRetrievals = queryResponse.matches.map((match: any, idx: number) => {
            return `\n Transcript chunks findings ${idx + 1}: \n ${match.metadata?.text} \n chunk timestamp startTime: ${match.metadata?.startTime} & endTime: ${match.metadata?.endTime}`
        }).join(`\n\n`)
        return concatRetrievals
    } else {
        return "<no match>";
    }
}

interface ChunkData {
    id: string;
    video_id: string;
    text: string;
    startTime: number;
    endTime: number;
    vector: number[];
}

/**
 * Generate embeddings for chunks of text
 */
export const generateEmbeddings = async (
    chunks: { text: string; startTime: number | null; endTime: number | null }[],
    video_id: string
) => {
    const results = [];
    for (const [i, chunk] of chunks.entries()) {
        try {
            const embedding = await getEmbedding(chunk.text, EMBEDDING_MODEL);
            
            // Ensure the vector has the expected dimension
            let finalEmbedding = embedding;
            if (embedding.length !== EXPECTED_DIMENSION) {
                console.log(`[HF DEBUG] Resizing vector from ${embedding.length} to ${EXPECTED_DIMENSION}`);
                
                if (embedding.length < EXPECTED_DIMENSION) {
                    // If smaller, pad with zeros
                    finalEmbedding = [...embedding];
                    while (finalEmbedding.length < EXPECTED_DIMENSION) {
                        finalEmbedding.push(0);
                    }
                } else {
                    // If larger, truncate
                    finalEmbedding = embedding.slice(0, EXPECTED_DIMENSION);
                }
            }
            
            results.push({
                id: `${video_id}-chunk-${i}`,
                video_id: video_id,
                text: chunk.text,
                startTime: chunk.startTime,
                endTime: chunk.endTime,
                vector: finalEmbedding,
            } as ChunkData);
        } catch (error) {
            console.error(`Error generating embedding for chunk ${i}:`, error);
        }
    }
    return results;
};