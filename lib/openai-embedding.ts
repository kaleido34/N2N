/**
 * Alternative implementation using OpenAI embeddings
 * This can be used if Hugging Face models continue to be problematic
 */

// Check if we have OpenAI API key in environment and test mode is not enabled
const useOpenAI = process.env.OPENAI_API_KEY && 
                  process.env.OPENAI_API_KEY.length > 0 && 
                  process.env.OPENAI_TEST_MODE !== "true";

// Expected vector dimension for Pinecone (based on error message)
const EXPECTED_DIMENSION = 1024;

/**
 * Generate embeddings using OpenAI API
 * @param text Text to generate embeddings for
 * @returns An array of numbers representing the embedding
 */
export async function getOpenAIEmbedding(text: string): Promise<number[]> {
  // Check if we're in test mode or don't have an API key
  if (!useOpenAI) {
    console.log("[OPENAI] Test mode enabled or no API key, using deterministic vectors");
    return generateDeterministicVector(text, EXPECTED_DIMENSION);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small" // Using OpenAI's smaller, faster embedding model
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OPENAI] API error (${response.status}): ${errorText}`);
      
      // Check if it's a quota error specifically
      if (response.status === 429) {
        console.log("[OPENAI] Quota exceeded, switching to deterministic embedding");
        // Use a deterministic vector based on the text instead of random
        // This ensures the same query always gets the same vector
        return generateDeterministicVector(text, EXPECTED_DIMENSION);
      }
      
      throw new Error(`OpenAI API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const embedding = result.data[0].embedding;

    console.log(`[OPENAI] Successfully generated embedding with ${embedding.length} dimensions`);

    // Ensure the vector has the correct dimension for Pinecone
    if (embedding.length < EXPECTED_DIMENSION) {
      // Pad with zeros if needed
      const paddedEmbedding = [...embedding];
      while (paddedEmbedding.length < EXPECTED_DIMENSION) {
        paddedEmbedding.push(0);
      }
      return paddedEmbedding;
    } else if (embedding.length > EXPECTED_DIMENSION) {
      // Truncate if needed
      return embedding.slice(0, EXPECTED_DIMENSION);
    }

    return embedding;
  } catch (error) {
    console.error("[OPENAI] Error generating embedding:", error);
    // Return deterministic vector as fallback
    return generateDeterministicVector(text, EXPECTED_DIMENSION);
  }
}

/**
 * Generate a deterministic vector based on input text
 * This creates a more meaningful vector than all zeros
 * while ensuring the same input text always produces the same vector
 */
function generateDeterministicVector(text: string, dimension: number): number[] {
  // Create a simple hash of the text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  const vector = new Array(dimension).fill(0);
  
  // Use the hash to seed a simple deterministic pattern
  for (let i = 0; i < dimension; i++) {
    // Generate a value between -1 and 1 based on position and hash
    vector[i] = Math.sin((i * hash) % 10000) / 2;
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

/**
 * Alternative implementation of queryPineconeVectorStore using OpenAI embeddings
 */
export async function queryPineconeWithOpenAI(
  client: any,
  indexname: string,
  namespace: string,
  video_id: string,
  searchQuery: string
): Promise<string> {
  console.log("[OPENAI] Generating embedding for search query:", searchQuery);
  
  try {
    const queryEmbedding = await getOpenAIEmbedding(searchQuery);
    console.log(`[OPENAI] Vector dimension: ${queryEmbedding.length}`);
    
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
    console.error("[OPENAI] Error during vector search:", error);
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

/**
 * Generate embeddings for chunks of text using OpenAI
 */
export const generateOpenAIEmbeddings = async (
  chunks: { text: string; startTime: number | null; endTime: number | null }[],
  video_id: string
) => {
  const results = [];
  for (const [i, chunk] of chunks.entries()) {
    try {
      const embedding = await getOpenAIEmbedding(chunk.text);
      
      results.push({
        id: `${video_id}-chunk-${i}`,
        video_id: video_id,
        text: chunk.text,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        vector: embedding,
      });
    } catch (error) {
      console.error(`Error generating OpenAI embedding for chunk ${i}:`, error);
    }
  }
  return results;
};