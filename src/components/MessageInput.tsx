import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaperPlaneTilt, Prohibit, Sparkle, Lightning, Stack } from '@phosphor-icons/react';

interface MessageInputProps {
  onSendMessage: (message: string, strategy?: 'fast' | 'comprehensive') => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [strategy, setStrategy] = useState<'fast' | 'comprehensive'>('comprehensive');

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage, strategy);
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
          
          <Select value={strategy} onValueChange={(value: 'fast' | 'comprehensive') => setStrategy(value)}>
            <SelectTrigger className="w-40 h-12 rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">
                <div className="flex items-center gap-2">
                  <Lightning className="w-4 h-4 text-orange-500" weight="fill" />
                  <span>Fast Mode</span>
                </div>
              </SelectItem>
              <SelectItem value="comprehensive">
                <div className="flex items-center gap-2">
                  <Stack className="w-4 h-4 text-blue-500" weight="fill" />
                  <span>Multi-AI</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
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
            Press Enter to send • {strategy === 'fast' ? 'Fast sequential fallback' : 'Multiple AI perspectives'} • Enhanced syntax highlighting
          </p>
        </div>
      </div>
    </div>
  );
}