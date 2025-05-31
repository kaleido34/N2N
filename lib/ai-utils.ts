/**
 * Cleans an AI response that might contain markdown code blocks
 * @param responseText The raw text from the AI response
 * @returns Cleaned JSON string
 */
export function cleanAiJsonResponse(responseText: string): string {
  // If the response is already valid JSON, return it as is
  try {
    JSON.parse(responseText);
    return responseText;
  } catch (e) {
    // Not valid JSON, continue with cleaning
  }

  // Clean the response
  const cleaned = responseText
    .replace(/```(?:json)?\s*/g, '') // Remove opening ```json or ```
    .replace(/```/g, '')             // Remove closing ```
    .trim();

  // Try to extract JSON from the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from AI response');
  }

  return jsonMatch[0];
}

/**
 * Safely parses JSON with error handling
 * @param jsonString The JSON string to parse
 * @returns The parsed JSON object
 * @throws Error if the text cannot be parsed as JSON
 */
export function safeJsonParse<T = any>(jsonString: string): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
    throw new Error('Failed to parse JSON: Unknown error');
  }
}

/**
 * Parses an AI response that might be wrapped in markdown code blocks
 * @param responseText The text to parse
 * @returns The parsed JSON object
 * @throws Error if the text cannot be parsed as JSON
 */
export function parseAiResponse<T = any>(responseText: string): T {
  try {
    // First try direct parse
    return JSON.parse(responseText);
  } catch (e) {
    try {
      // If direct parse fails, clean and try again
      const cleaned = cleanAiJsonResponse(responseText);
      return JSON.parse(cleaned);
    } catch (innerError) {
      if (innerError instanceof Error) {
        throw new Error(`Failed to parse AI response: ${innerError.message}`);
      }
      throw new Error('Failed to parse AI response: Unknown error');
    }
  }
}

/**
 * Safely parses JSON from an AI response, handling markdown code blocks
 * @param text The text to parse
 * @returns The parsed JSON object
 * @throws Error if the text cannot be parsed as JSON
 */
export function safeJsonParseFromAiResponse<T = any>(text: string): T {
  try {
    const cleaned = cleanAiJsonResponse(text);
    return safeJsonParse(cleaned) as T;
  } catch (error: unknown) {
    console.error('Failed to parse JSON:', text);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid JSON response: ${errorMessage}`);
  }
}
