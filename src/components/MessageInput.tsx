import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaperPlaneTilt, Prohibit } from '@phosphor-icons/react';

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
    <div className="flex gap-2 p-4 border-t bg-background/80 backdrop-blur-sm">
      <Input
        id="message-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? "AI is thinking..." : placeholder}
        disabled={disabled}
        className="flex-1 focus:ring-2 focus:ring-primary/20"
        autoComplete="off"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="shrink-0 transition-all duration-200"
      >
        {disabled ? (
          <Prohibit className="w-4 h-4" />
        ) : (
          <PaperPlaneTilt className="w-4 h-4" weight="fill" />
        )}
      </Button>
    </div>
  );
}