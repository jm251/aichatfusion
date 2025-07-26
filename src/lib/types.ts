export type AIService = 'groq' | 'gemini' | 'perplexity' | 'openrouter' | 'spark-llm';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  source?: AIService;
  isLoading?: boolean;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error?: string;
}

export interface AIResponse {
  content: string;
  source: AIService;
  success: boolean;
  error?: string;
  keyUsed?: string;
  responseTime?: number;
  model?: string;
}

export interface APIStrategy {
  speed: 'groq';
  reasoning: 'gemini';
  factual: 'perplexity';
  specialized: 'openrouter';
  fallback: 'spark-llm';
}

export interface ResponseAnalysis {
  bestResponse: AIResponse;
  confidence: number;
  reasoning: string;
  commonThemes: string[];
}