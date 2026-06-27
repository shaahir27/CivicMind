import { GoogleGenAI } from '@google/genai';

/**
 * Wraps Gemini API calls with exponential backoff to gracefully handle
 * 429 Too Many Requests and 503 Service Unavailable errors on the free tier.
 */
export async function generateContentWithRetry(
  client: GoogleGenAI,
  request: { model: string; contents: any; config?: any },
  maxRetries = 3
): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await client.models.generateContent(request);
    } catch (error: any) {
      attempt++;
      
      const errorMessage = error?.message || '';
      const errorStatus = error?.status || 0;
      
      const isRateLimit = errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
      const isServiceUnavailable = errorStatus === 503 || errorMessage.includes('503') || errorMessage.includes('Service Unavailable');
      
      if ((isRateLimit || isServiceUnavailable) && attempt <= maxRetries) {
        // Exponential backoff: 2s, 4s, 8s...
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(`[AI Service] Gemini API rate limit/unavailable. Retrying in ${delayMs}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error; // Max retries exceeded or different error
      }
    }
  }
}
