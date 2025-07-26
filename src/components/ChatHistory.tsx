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
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
          <p className="text-sm">
            Ask me anything! I'll provide thoughtful responses and show you different perspectives when possible.
          </p>
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
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <div className="space-y-6">
        {groupedMessages.map((item, index) => {
          if (Array.isArray(item)) {
            // Multiple AI responses - show comparison view
            return (
              <div key={`group-${index}`} className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Separator className="flex-1" />
                  <span>Multiple AI Responses</span>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {item.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onCopy={handleCopyMessage}
                    />
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