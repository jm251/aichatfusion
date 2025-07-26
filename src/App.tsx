import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Message } from '@/lib/types';
import { AIService } from '@/lib/ai-service';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatHistory } from '@/components/ChatHistory';
import { MessageInput } from '@/components/MessageInput';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const [messages, setMessages] = useKV<Message[]>('chat-messages', []);
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      content: content.trim(),
      role: 'user',
      timestamp: Date.now()
    };

    // Add user message immediately
    setMessages(currentMessages => [...currentMessages, userMessage]);
    setIsLoading(true);

    try {
      // Get AI responses
      const aiResponses = await AIService.getAIResponses(content);
      
      // Convert AI responses to messages
      const aiMessages: Message[] = aiResponses.map(response => ({
        id: generateId(),
        content: response.content,
        role: 'assistant' as const,
        timestamp: Date.now(),
        source: response.source,
        error: response.success ? undefined : response.error
      }));

      // Add AI messages
      setMessages(currentMessages => [...currentMessages, ...aiMessages]);

      if (aiMessages.length === 0) {
        toast.error('No AI responses received');
      } else if (aiMessages.length > 1) {
        toast.success('Multiple AI perspectives provided');
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setMessages(currentMessages => [...currentMessages, errorMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (messages.length === 0) return;
    
    setMessages([]);
    toast.success('Chat history cleared');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader 
        messageCount={messages.length}
        onClearHistory={handleClearHistory}
        isLoading={isLoading}
      />
      
      <ChatHistory messages={messages} />
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder={isLoading ? "AI is thinking..." : "Ask me anything..."}
      />
      
      <Toaster position="top-center" />
    </div>
  );
}

export default App;