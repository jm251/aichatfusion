import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash, Robot, Lightbulb } from '@phosphor-icons/react';

interface ChatHeaderProps {
  messageCount: number;
  onClearHistory: () => void;
  isLoading?: boolean;
}

export function ChatHeader({ messageCount, onClearHistory, isLoading }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Robot className="w-6 h-6 text-primary" weight="fill" />
          <h1 className="text-xl font-bold">AI Chat Assistant</h1>
        </div>
        {messageCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {messageCount} messages
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>AI thinking...</span>
          </div>
        )}
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
          <Lightbulb className="w-3 h-3" />
          <span>Dual AI responses</span>
        </div>
        
        {messageCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHistory}
            className="text-muted-foreground hover:text-destructive"
            disabled={isLoading}
          >
            <Trash className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}