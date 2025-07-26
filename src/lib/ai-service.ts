import { AIResponse, AIService as AIServiceType } from './types';
import { APIConfigService } from './api-config';

export class AIService {
  
  private static async callPerplexityAPI(message: string, maxRetries = 3): Promise<AIResponse> {
    let lastError: string | null = null;
    let keyUsed: string | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        keyUsed = await APIConfigService.getNextPerplexityKey();
        
        if (!keyUsed) {
          return {
            content: '',
            source: 'perplexity',
            success: false,
            error: 'No Perplexity API keys available'
          };
        }

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keyUsed}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-large-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are Perplexity AI, a helpful assistant that provides accurate and up-to-date information with web search capabilities.'
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 1000,
            temperature: 0.7,
            stream: false
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          lastError = `Perplexity API error: ${response.status} - ${errorData}`;
          
          // Mark key as potentially failed for rate limiting or quota issues
          if (response.status === 429 || response.status === 402) {
            await APIConfigService.markKeyAsFailed('perplexity', keyUsed);
          }
          
          continue; // Try next key
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          lastError = 'Invalid response format from Perplexity API';
          continue;
        }

        return {
          content: data.choices[0].message.content,
          source: 'perplexity',
          success: true,
          keyUsed
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error with Perplexity API';
        
        if (keyUsed) {
          await APIConfigService.markKeyAsFailed('perplexity', keyUsed);
        }
      }
    }

    return {
      content: '',
      source: 'perplexity',
      success: false,
      error: lastError || 'Failed to get response from Perplexity after all retries'
    };
  }

  private static async callGeminiAPI(message: string, maxRetries = 3): Promise<AIResponse> {
    let lastError: string | null = null;
    let keyUsed: string | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        keyUsed = await APIConfigService.getNextGeminiKey();
        
        if (!keyUsed) {
          return {
            content: '',
            source: 'gemini',
            success: false,
            error: 'No Gemini API keys available'
          };
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${keyUsed}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are Google Gemini, a helpful AI assistant. Please provide a thoughtful response to: ${message}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1000,
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          lastError = `Gemini API error: ${response.status} - ${errorData}`;
          
          // Mark key as potentially failed for quota issues
          if (response.status === 429 || response.status === 403) {
            await APIConfigService.markKeyAsFailed('gemini', keyUsed);
          }
          
          continue; // Try next key
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
          lastError = 'Invalid response format from Gemini API';
          continue;
        }

        const content = data.candidates[0].content.parts[0].text;

        return {
          content,
          source: 'gemini',
          success: true,
          keyUsed
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error with Gemini API';
        
        if (keyUsed) {
          await APIConfigService.markKeyAsFailed('gemini', keyUsed);
        }
      }
    }

    return {
      content: '',
      source: 'gemini',
      success: false,
      error: lastError || 'Failed to get response from Gemini after all retries'
    };
  }

  private static async callSparkLLM(message: string): Promise<AIResponse> {
    try {
      const prompt = spark.llmPrompt`You are Spark LLM, a helpful AI assistant. Please provide a comprehensive response to: ${message}`;
      const response = await spark.llm(prompt, 'gpt-4o');
      
      return {
        content: response,
        source: 'spark-llm',
        success: true
      };
    } catch (error) {
      return {
        content: '',
        source: 'spark-llm',
        success: false,
        error: error instanceof Error ? error.message : 'Spark LLM service failed'
      };
    }
  }

  static async getAIResponses(message: string): Promise<AIResponse[]> {
    const responses: AIResponse[] = [];
    const availableServices = APIConfigService.getAvailableServices();
    
    // Try to get responses from available external APIs
    const promises: Promise<AIResponse>[] = [];
    
    if (availableServices.perplexity) {
      promises.push(this.callPerplexityAPI(message));
    }
    
    if (availableServices.gemini) {
      promises.push(this.callGeminiAPI(message));
    }
    
    // Always include Spark LLM as backup
    promises.push(this.callSparkLLM(message));
    
    // Execute all API calls concurrently
    const results = await Promise.allSettled(promises);
    
    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        responses.push(result.value);
      } else if (result.status === 'fulfilled') {
        // API call completed but failed - log the failure but don't add to responses
        console.warn(`AI service ${result.value.source} failed:`, result.value.error);
      }
    }
    
    // If no responses succeeded, return an error message
    if (responses.length === 0) {
      responses.push({
        content: 'I apologize, but all AI services are currently unavailable. Please check your API keys and try again.',
        source: 'spark-llm',
        success: false,
        error: 'All AI services failed to respond'
      });
    }
    
    return responses;
  }

  static getConfiguredServices(): { perplexity: boolean; gemini: boolean; sparkLLM: boolean } {
    const available = APIConfigService.getAvailableServices();
    return {
      perplexity: available.perplexity,
      gemini: available.gemini,
      sparkLLM: true // Always available
    };
  }
}