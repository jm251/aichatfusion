import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { User, Robot, Copy, Clock } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
  message: Message;
  onCopy?: (content: string) => void;
}

export function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;
  const hasError = !!message.error;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getBubbleStyles = () => {
    if (isUser) {
      return 'bg-user-message text-user-message-foreground ml-12';
    }
    
    // Different colors for different AI services
    switch (message.source) {
      case 'perplexity':
        return 'bg-ai-primary text-ai-primary-foreground mr-12';
      case 'gemini':
        return 'bg-ai-secondary text-ai-secondary-foreground mr-12';
      case 'spark-llm':
        return 'bg-accent text-accent-foreground mr-12';
      default:
        return 'bg-ai-primary text-ai-primary-foreground mr-12';
    }
  };

  const getIcon = () => {
    if (isUser) return <User className="w-4 h-4" />;
    return <Robot className="w-4 h-4" />;
  };

  const getSourceBadge = () => {
    if (isUser || !message.source) return null;
    
    const getServiceInfo = (source: string) => {
      switch (source) {
        case 'perplexity':
          return { name: 'Perplexity AI', variant: 'default' as const };
        case 'gemini':
          return { name: 'Google Gemini', variant: 'secondary' as const };
        case 'spark-llm':
          return { name: 'Spark LLM', variant: 'outline' as const };
        default:
          return { name: source, variant: 'default' as const };
      }
    };
    
    const serviceInfo = getServiceInfo(message.source);
    
    return (
      <Badge 
        variant={serviceInfo.variant}
        className="text-xs"
      >
        {serviceInfo.name}
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex gap-3 group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          {getIcon()}
        </div>
      )}
      
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        <div className="flex items-center gap-2">
          {getSourceBadge()}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        <Card className={cn(
          'p-3 shadow-sm transition-all duration-200',
          getBubbleStyles(),
          hasError && 'border-destructive bg-destructive/10 text-destructive',
          'group-hover:shadow-md'
        )}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse flex gap-1">
                <div className="w-2 h-2 bg-current/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-current/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-current/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm opacity-70">Thinking...</span>
            </div>
          ) : hasError ? (
            <div className="text-sm">
              <div className="font-medium">Error occurred</div>
              <div className="text-xs opacity-70 mt-1">{message.error}</div>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          )}
          
          {!isLoading && !hasError && onCopy && (
            <button
              onClick={() => onCopy(message.content)}
              className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-1 hover:bg-black/10 rounded"
              title="Copy message"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </Card>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-user-message flex items-center justify-center">
          {getIcon()}
        </div>
      )}
    </motion.div>
  );
}