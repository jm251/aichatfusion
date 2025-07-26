import { AIResponse } from './types';

export class AIService {
  private static async callPrimaryAI(message: string): Promise<AIResponse> {
    try {
      const prompt = spark.llmPrompt`You are a helpful AI assistant. Please provide a thoughtful and comprehensive response to the following message: ${message}`;
      const response = await spark.llm(prompt, 'gpt-4o');
      
      return {
        content: response,
        source: 'primary',
        success: true
      };
    } catch (error) {
      return {
        content: '',
        source: 'primary',
        success: false,
        error: error instanceof Error ? error.message : 'Primary AI service failed'
      };
    }
  }

  private static async callSecondaryAI(message: string): Promise<AIResponse> {
    try {
      const prompt = spark.llmPrompt`You are an alternative AI assistant providing a different perspective. Give a helpful response to: ${message}`;
      const response = await spark.llm(prompt, 'gpt-4o-mini');
      
      return {
        content: response,
        source: 'secondary',
        success: true
      };
    } catch (error) {
      return {
        content: '',
        source: 'secondary',
        success: false,
        error: error instanceof Error ? error.message : 'Secondary AI service failed'
      };
    }
  }

  static async getAIResponses(message: string): Promise<AIResponse[]> {
    const responses: AIResponse[] = [];
    
    // Try primary AI first
    const primaryResponse = await this.callPrimaryAI(message);
    
    if (primaryResponse.success) {
      responses.push(primaryResponse);
      
      // If primary succeeds, also try secondary for comparison
      try {
        const secondaryResponse = await this.callSecondaryAI(message);
        if (secondaryResponse.success) {
          responses.push(secondaryResponse);
        }
      } catch {
        // Secondary failure is not critical if primary succeeded
      }
    } else {
      // Primary failed, try secondary as fallback
      const secondaryResponse = await this.callSecondaryAI(message);
      if (secondaryResponse.success) {
        responses.push(secondaryResponse);
      } else {
        // Both failed, return error
        responses.push({
          content: 'I apologize, but I\'m unable to respond right now. Please try again in a moment.',
          source: 'primary',
          success: false,
          error: 'Both AI services are currently unavailable'
        });
      }
    }
    
    return responses;
  }
}