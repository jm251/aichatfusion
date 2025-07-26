export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  source?: 'primary' | 'secondary';
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
  source: 'primary' | 'secondary';
  success: boolean;
  error?: string;
}