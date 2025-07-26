import { AIResponse, ResponseAnalysis } from './types';
import { APIConfigService } from './api-config';

export class AIService {
  
  // Strategy 1: Sequential Fallback (Speed Priority)
  private static async callGroqAPI(message: string, timeout = 5000): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      keyUsed = await APIConfigService.getNextKey('groq');
      
      if (!keyUsed) {
        return {
          content: '',
          source: 'groq',
          success: false,
          error: 'No Groq API keys available',
          responseTime: Date.now() - startTime
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keyUsed}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile', // Fast, high-quality model
          messages: [
            {
              role: 'system',
              content: 'You are Groq AI, an ultra-fast AI assistant optimized for real-time interactions. Provide concise, helpful responses quickly.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        if (response.status === 429 || response.status === 402) {
          await APIConfigService.markKeyAsFailed('groq', keyUsed);
        }
        throw new Error(`Groq API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Groq API');
      }

      return {
        content: data.choices[0].message.content,
        source: 'groq',
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: 'llama-3.1-70b-versatile'
      };

    } catch (error) {
      if (keyUsed) {
        await APIConfigService.markKeyAsFailed('groq', keyUsed);
      }
      
      return {
        content: '',
        source: 'groq',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Groq API error',
        responseTime: Date.now() - startTime
      };
    }
  }

  private static async callGeminiAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      keyUsed = await APIConfigService.getNextKey('gemini');
      
      if (!keyUsed) {
        return {
          content: '',
          source: 'gemini',
          success: false,
          error: 'No Gemini API keys available',
          responseTime: Date.now() - startTime
        };
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${keyUsed}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Google Gemini, a sophisticated AI assistant designed for complex reasoning and comprehensive analysis. Please provide a thoughtful, well-structured response to: ${message}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        if (response.status === 429 || response.status === 403) {
          await APIConfigService.markKeyAsFailed('gemini', keyUsed);
        }
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
        throw new Error('Invalid response format from Gemini API');
      }

      const content = data.candidates[0].content.parts[0].text;

      return {
        content,
        source: 'gemini',
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: 'gemini-1.5-pro'
      };

    } catch (error) {
      if (keyUsed) {
        await APIConfigService.markKeyAsFailed('gemini', keyUsed);
      }
      
      return {
        content: '',
        source: 'gemini',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Gemini API error',
        responseTime: Date.now() - startTime
      };
    }
  }

  private static async callPerplexityAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      keyUsed = await APIConfigService.getNextKey('perplexity');
      
      if (!keyUsed) {
        return {
          content: '',
          source: 'perplexity',
          success: false,
          error: 'No Perplexity API keys available',
          responseTime: Date.now() - startTime
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
              content: 'You are Perplexity AI, a research-focused AI assistant with real-time web search capabilities. Provide factual, up-to-date information with proper sourcing when possible.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 1200,
          temperature: 0.3, // Lower temperature for factual accuracy
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        if (response.status === 429 || response.status === 402) {
          await APIConfigService.markKeyAsFailed('perplexity', keyUsed);
        }
        throw new Error(`Perplexity API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Perplexity API');
      }

      return {
        content: data.choices[0].message.content,
        source: 'perplexity',
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: 'llama-3.1-sonar-large'
      };

    } catch (error) {
      if (keyUsed) {
        await APIConfigService.markKeyAsFailed('perplexity', keyUsed);
      }
      
      return {
        content: '',
        source: 'perplexity',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Perplexity API error',
        responseTime: Date.now() - startTime
      };
    }
  }

  private static async callOpenRouterAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      keyUsed = await APIConfigService.getNextKey('openrouter');
      
      if (!keyUsed) {
        return {
          content: '',
          source: 'openrouter',
          success: false,
          error: 'No OpenRouter API keys available',
          responseTime: Date.now() - startTime
        };
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keyUsed}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Chat Assistant'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet', // High-quality specialized model
          messages: [
            {
              role: 'system',
              content: 'You are Claude via OpenRouter, a sophisticated AI assistant specialized in nuanced analysis and creative problem-solving. Provide detailed, thoughtful responses.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 1500,
          temperature: 0.8,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        if (response.status === 429 || response.status === 402) {
          await APIConfigService.markKeyAsFailed('openrouter', keyUsed);
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      return {
        content: data.choices[0].message.content,
        source: 'openrouter',
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: 'claude-3.5-sonnet'
      };

    } catch (error) {
      if (keyUsed) {
        await APIConfigService.markKeyAsFailed('openrouter', keyUsed);
      }
      
      return {
        content: '',
        source: 'openrouter',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OpenRouter API error',
        responseTime: Date.now() - startTime
      };
    }
  }

  private static async callSparkLLM(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = spark.llmPrompt`You are Spark LLM, a reliable AI assistant that serves as the final fallback when other services are unavailable. Please provide a comprehensive and helpful response to: ${message}`;
      const response = await spark.llm(prompt, 'gpt-4o');
      
      return {
        content: response,
        source: 'spark-llm',
        success: true,
        responseTime: Date.now() - startTime,
        model: 'gpt-4o'
      };
    } catch (error) {
      return {
        content: '',
        source: 'spark-llm',
        success: false,
        error: error instanceof Error ? error.message : 'Spark LLM service failed',
        responseTime: Date.now() - startTime
      };
    }
  }

  // Fast Sequential Fallback Strategy
  private static async getSequentialResponse(message: string): Promise<AIResponse> {
    const availableServices = APIConfigService.getAvailableServices();
    
    // Try Groq first for speed
    if (availableServices.groq) {
      const groqResponse = await this.callGroqAPI(message, 3000); // 3 second timeout
      if (groqResponse.success) {
        return groqResponse;
      }
    }
    
    // Fallback to Gemini for reliability
    if (availableServices.gemini) {
      const geminiResponse = await this.callGeminiAPI(message);
      if (geminiResponse.success) {
        return geminiResponse;
      }
    }
    
    // Final fallback to OpenRouter
    if (availableServices.openrouter) {
      const openrouterResponse = await this.callOpenRouterAPI(message);
      if (openrouterResponse.success) {
        return openrouterResponse;
      }
    }
    
    // Last resort: Spark LLM
    return await this.callSparkLLM(message);
  }

  // Parallel Multi-Response Strategy
  private static async getParallelResponses(message: string): Promise<AIResponse[]> {
    const availableServices = APIConfigService.getAvailableServices();
    const promises: Promise<AIResponse>[] = [];
    
    // Add available services to parallel execution
    if (availableServices.groq) {
      promises.push(this.callGroqAPI(message));
    }
    
    if (availableServices.gemini) {
      promises.push(this.callGeminiAPI(message));
    }
    
    if (availableServices.perplexity) {
      promises.push(this.callPerplexityAPI(message));
    }
    
    if (availableServices.openrouter) {
      promises.push(this.callOpenRouterAPI(message));
    }
    
    // Always include Spark LLM as backup
    promises.push(this.callSparkLLM(message));
    
    // Execute all API calls concurrently
    const results = await Promise.allSettled(promises);
    const responses: AIResponse[] = [];
    
    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      }
    }
    
    // Filter successful responses
    const successfulResponses = responses.filter(r => r.success);
    
    return successfulResponses.length > 0 ? successfulResponses : responses;
  }

  // Intelligent Response Analysis
  private static async analyzeResponses(responses: AIResponse[]): Promise<ResponseAnalysis> {
    if (responses.length === 0) {
      throw new Error('No responses to analyze');
    }
    
    if (responses.length === 1) {
      return {
        bestResponse: responses[0],
        confidence: responses[0].success ? 0.8 : 0.3,
        reasoning: `Single response from ${responses[0].source}`,
        commonThemes: []
      };
    }
    
    // Use AI to analyze and judge the responses
    try {
      const responseTexts = responses.map((r, i) => 
        `Response ${i + 1} (${r.source}${r.model ? ` - ${r.model}` : ''}): ${r.content}`
      ).join('\n\n');
      
      const analysisPrompt = spark.llmPrompt`Analyze these AI responses and determine which is the best. Consider accuracy, completeness, clarity, and relevance. Return your analysis in this exact JSON format:

{
  "bestResponseIndex": 0,
  "confidence": 0.9,
  "reasoning": "Brief explanation of why this response is best",
  "commonThemes": ["theme1", "theme2"]
}

Responses to analyze:
${responseTexts}`;
      
      const analysisResult = await spark.llm(analysisPrompt, 'gpt-4o-mini', true);
      const analysis = JSON.parse(analysisResult);
      
      const bestIndex = Math.min(analysis.bestResponseIndex, responses.length - 1);
      
      return {
        bestResponse: responses[bestIndex],
        confidence: Math.min(Math.max(analysis.confidence, 0), 1),
        reasoning: analysis.reasoning || `Selected ${responses[bestIndex].source} response`,
        commonThemes: Array.isArray(analysis.commonThemes) ? analysis.commonThemes : []
      };
      
    } catch (error) {
      // Fallback: select based on simple heuristics
      const successfulResponses = responses.filter(r => r.success);
      
      if (successfulResponses.length === 0) {
        return {
          bestResponse: responses[0],
          confidence: 0.3,
          reasoning: 'No successful responses available',
          commonThemes: []
        };
      }
      
      // Prefer faster, successful responses
      const sortedBySpeed = successfulResponses.sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
      
      return {
        bestResponse: sortedBySpeed[0],
        confidence: 0.7,
        reasoning: `Selected fastest successful response from ${sortedBySpeed[0].source}`,
        commonThemes: []
      };
    }
  }

  // Main public method - determines strategy based on user preference
  static async getAIResponses(message: string, strategy: 'fast' | 'comprehensive' = 'comprehensive'): Promise<AIResponse[]> {
    try {
      if (strategy === 'fast') {
        // Sequential fallback for speed
        const response = await this.getSequentialResponse(message);
        return [response];
      } else {
        // Parallel responses for comprehensive analysis
        const responses = await this.getParallelResponses(message);
        
        if (responses.length === 0) {
          return [{
            content: 'I apologize, but all AI services are currently unavailable. Please check your API keys and try again.',
            source: 'spark-llm',
            success: false,
            error: 'All AI services failed to respond'
          }];
        }
        
        return responses;
      }
    } catch (error) {
      return [{
        content: 'An unexpected error occurred while processing your request.',
        source: 'spark-llm',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }

  // Get best response from multiple responses
  static async getBestResponse(message: string): Promise<AIResponse> {
    const responses = await this.getParallelResponses(message);
    const analysis = await this.analyzeResponses(responses);
    return analysis.bestResponse;
  }

  // Get service status
  static getConfiguredServices(): { 
    groq: boolean; 
    gemini: boolean; 
    perplexity: boolean; 
    openrouter: boolean;
    sparkLLM: boolean;
  } {
    const available = APIConfigService.getAvailableServices();
    return {
      groq: available.groq,
      gemini: available.gemini,
      perplexity: available.perplexity,
      openrouter: available.openrouter,
      sparkLLM: true // Always available
    };
  }
}