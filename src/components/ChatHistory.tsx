import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Message } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Bot, Link, X, ArrowDown, Sparkles } from 'lucide-react';

interface ChatHistoryProps {
  messages: Message[];
  onDeleteMessage?: (messageId: string) => void;
}

const starterPrompts = [
  'Compare two approaches and recommend one',
  'Summarize this topic in plain language',
  'Generate a step-by-step implementation plan',
];

export const ChatHistory = memo(function ChatHistory({ messages, onDeleteMessage }: ChatHistoryProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const updateScrollState = useCallback(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const threshold = 120;
    const distanceToBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
    const isAtBottom = distanceToBottom < threshold;
    shouldAutoScrollRef.current = isAtBottom;
    setShowScrollToBottom(!isAtBottom);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    updateScrollState();
    scrollContainer.addEventListener('scroll', updateScrollState, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  const handleScrollToBottom = () => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    shouldAutoScrollRef.current = true;
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    setShowScrollToBottom(false);
  };

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer || !shouldAutoScrollRef.current) return;

    requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
  }, [messages]);

  const handleCopyMessage = (content: string) => {
    if (!navigator.clipboard?.writeText) {
      toast.error('Clipboard not available');
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      toast.success('Message copied');
    }).catch(() => {
      toast.error('Failed to copy message');
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!onDeleteMessage) return;
    onDeleteMessage(messageId);
    toast.success('Message deleted');
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 px-3 xs:px-4 lg:px-6 xl:px-8 2xl:px-12"
      >
        <div className="mx-auto max-w-4xl py-4 xs:py-6 space-y-5 xs:space-y-6 chat-content-wrapper">
          {messages.length === 0 ? (
            <div className="flex min-h-[52vh] sm:min-h-[60vh] items-center justify-center py-8">
              <div className="w-full max-w-2xl rounded-3xl border border-border/70 bg-card/75 p-6 sm:p-8 shadow-sm panel-surface surface-enter">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-center text-xl font-semibold text-foreground font-display section-title">
                  Start a better conversation
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-center text-sm section-subtitle">
                  Ask a question, compare perspectives, or generate images. Your chats are auto-saved.
                </p>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {starterPrompts.map((prompt) => (
                    <div
                      key={prompt}
                      className="rounded-xl border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground"
                    >
                      {prompt}
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex justify-center">
                  <a
                    href="https://streams-ai.netlify.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
                  >
                    Explore Streams AI
                    <Link size={12} />
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          {messages.length > 0 && (
            <div className="mb-2 flex items-center gap-3 px-2">
              <Separator className="flex-1" />
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Live chat timeline
              </div>
              <Separator className="flex-1" />
            </div>
          )}

          <div className="space-y-8 w-full">
            {messages.length > 0 && messages.map((item, index) => {
              if (Array.isArray(item)) {
                return (
                  <div key={`group-${index}`} className="space-y-4 w-full">
                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                      <Separator className="flex-1" />
                      <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1">
                        <span>Multiple AI perspectives</span>
                      </div>
                      <Separator className="flex-1" />
                    </div>
                    <div className="chat-responses-grid">
                      {item.map((message) => (
                        <div key={message.id} className="message-bubble-container min-w-0">
                           <div className="message-content-wrapper relative group">
                            <MessageBubble
                              message={message}
                              onCopy={handleCopyMessage}
                            />
                            {onDeleteMessage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(message.id)}
                                className="absolute right-2 top-2 rounded-full border border-border/70 bg-card hover:bg-destructive hover:text-destructive-foreground text-xs px-2 py-0.5 transition opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                                aria-label="Delete message"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="w-full message-bubble-container">
                  <div className="message-content-wrapper relative group">
                    <MessageBubble
                      key={item.id}
                      message={item}
                      onCopy={handleCopyMessage}
                    />
                    {onDeleteMessage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(item.id)}
                        className="absolute right-2 top-2 rounded-full border border-border/70 bg-card hover:bg-destructive hover:text-destructive-foreground text-xs px-2 py-0.5 transition opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                        aria-label="Delete message"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {showScrollToBottom && messages.length > 0 && (
        <div className="absolute right-4 z-10 bottom-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleScrollToBottom}
            className="scroll-to-latest px-3 text-xs font-semibold"
            aria-label="Jump to latest messages"
          >
            <ArrowDown className="w-4 h-4" />
            Jump to latest
          </Button>
        </div>
      )}
    </div>
  );
});
