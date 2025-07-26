export type AIService = 'perplexity' | 'gemini' | 'spark-llm';

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
  keyUsed?: string; // Track which API key was used
}