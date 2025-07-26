import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaperPlaneTilt, Prohibit, Sparkle } from '@phosphor-icons/react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-6 border-t bg-white/80 backdrop-blur-lg shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Input
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? "AI is thinking..." : placeholder}
              disabled={disabled}
              className="h-12 px-4 pr-12 text-base rounded-xl border-2 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-sm"
              autoComplete="off"
            />
            {disabled && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Sparkle className="w-5 h-5 text-primary animate-pulse" weight="fill" />
              </div>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            size="lg"
            className="h-12 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {disabled ? (
              <Prohibit className="w-5 h-5" />
            ) : (
              <PaperPlaneTilt className="w-5 h-5" weight="fill" />
            )}
            <span className="hidden sm:inline ml-2">
              {disabled ? 'Thinking...' : 'Send'}
            </span>
          </Button>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Press Enter to send • AI responses from multiple services
          </p>
        </div>
      </div>
    </div>
  );
}