export type AIService =
  | 'groq'
  | 'gemini'
  | 'openai'
  | 'openrouter'
  | 'github'
  | 'cohere'
  | 'xai'
  | 'fastrouter'
  | 'system'
  | 'consensus';

export interface AIServiceInfo {
  id: AIService;
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;  // Changed from string to number
  model?: string | null;
  service?: string | null;
  responseTime?: number | null;
  isError?: boolean;
  errorMessage?: string | null;
  isFinalResponse?: boolean;
  status?: 'pending' | 'streaming' | 'complete' | 'error';
  imageUrl?: string;

  // Add missing optional properties used in the app
  source?: 'groq' | 'gemini' | 'openai' | 'openrouter' | 'github' | 'cohere' | 'xai' | 'fastrouter' | 'system' | 'consensus';
  isLoading?: boolean;
  loadingService?: string;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error?: string;
}

export interface AIResponse {
  content: string;
  source: 'groq' | 'gemini' | 'openai' | 'openrouter' | 'github' | 'cohere' | 'xai' | 'fastrouter' | 'system';
  success: boolean;
  error?: string;
  keyUsed?: string;
  responseTime?: number;
  model?: string;
  isRateLimited?: boolean;
}

// FastRouter model type for Anthropic Claude models
export type FastRouterModel =
  | 'anthropic/claude-sonnet-4-20250514'
  | 'anthropic/claude-3-5-sonnet-20241022'
  | 'anthropic/claude-3-5-haiku-20241022';

export interface APIStrategy {
  speed: 'groq';
  reasoning: 'gemini';
  fallback: 'openrouter';
  advanced: 'github';
  command: 'cohere';
}

export interface ResponseAnalysis {
  bestResponse: AIResponse;
  confidence: number;
  reasoning: string;
  commonThemes: string[];
}

export interface FirebaseChat {
  id: string;
  userId: string;
  participants: string[]; // Add participants field
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Add OpenRouter model type for better type checking
export type OpenRouterModel =
  | 'meta-llama/llama-3.3-70b-instruct:free'
  | 'qwen/qwen3-coder:free'
  | 'mistralai/mistral-7b-instruct:free';

// Add GitHub Models type for better type checking
export type GitHubModel =

  | 'deepseek/DeepSeek-V3-0324'
  | 'xai/grok-3-mini'
  | 'xai/grok-3'
  | 'meta/Llama-4-Scout-17B-16E-Instruct'
  | 'mistral-ai/Codestral-2501'
  | 'openai/gpt-4.1';

// Add Cohere model type
export type CohereModel =
  | 'command-a-03-2025'
  | 'command-r-plus-08-2024'
  | 'command-r7b-12-2024';

export interface ConsensusResponse {
  content: string;
  source: 'consensus';
  success: boolean;
  error?: string;
  responseTime?: number;
  confidence: number; // 0-1 confidence score
  contributingModels: string[];
  commonThemes: string[];
  modelResponses: AIResponse[];
}

export interface ConsensusAnalysis {
  unifiedResponse: string;
  confidence: number;
  commonThemes: string[];
  keyAgreements: string[];
  keyDisagreements: string[];
  semanticSimilarity: number;
}

export interface ImageGenerationRequest {
  prompt: string;
  image?: File | string; // Base64 or File object
  model?: 'openai/dall-e-3';
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  imageData?: string; // Base64 encoded image
  text?: string; // Any text response from the model
  error?: string;
  responseTime?: number;
}
