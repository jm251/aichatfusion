import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface ChatHistoryProps {
  messages: Message[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success('Message copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy message');
    });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
            <div className="text-4xl">🤖</div>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">Welcome to AI Chat Assistant</h3>
          <p className="text-sm leading-relaxed mb-4">
            Ask me anything! I'll provide responses using our advanced multi-AI strategy with specialized services for speed, reasoning, and factual accuracy.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Groq ⚡</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Perplexity 🌐</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Gemini 🧐</span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">OpenRouter 🎯</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Spark LLM 🔄</span>
          </div>
        </div>
      </div>
    );
  }

  // Group consecutive messages from the same timestamp to show comparisons
  const groupedMessages: (Message | Message[])[] = [];
  let currentGroup: Message[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      if (currentGroup.length > 0) {
        if (currentGroup.length === 1) {
          groupedMessages.push(currentGroup[0]);
        } else {
          groupedMessages.push(currentGroup);
        }
        currentGroup = [];
      }
      groupedMessages.push(message);
    } else {
      // Check if this assistant message should be grouped with previous assistant messages
      const lastMessage = currentGroup[currentGroup.length - 1];
      if (lastMessage && Math.abs(message.timestamp - lastMessage.timestamp) < 5000) {
        currentGroup.push(message);
      } else {
        if (currentGroup.length > 0) {
          if (currentGroup.length === 1) {
            groupedMessages.push(currentGroup[0]);
          } else {
            groupedMessages.push(currentGroup);
          }
        }
        currentGroup = [message];
      }
    }
  }

  // Handle remaining group
  if (currentGroup.length > 0) {
    if (currentGroup.length === 1) {
      groupedMessages.push(currentGroup[0]);
    } else {
      groupedMessages.push(currentGroup);
    }
  }

    return (
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="space-y-8 max-w-4xl mx-auto">
          {groupedMessages.map((item, index) => {
            if (Array.isArray(item)) {
              // Multiple AI responses - show comparison view
              return (
                <div key={`group-${index}`} className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <Separator className="flex-1" />
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full">
                      <span>✨ Multiple AI Perspectives</span>
                    </div>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {item.map((message) => (
                      <div key={message.id} className="space-y-2">
                        <MessageBubble
                          message={message}
                          onCopy={handleCopyMessage}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else {
              // Single message
              return (
                <MessageBubble
                  key={item.id}
                  message={item}
                  onCopy={handleCopyMessage}
                />
              );
            }
          })}
        </div>
      </ScrollArea>
    );
}