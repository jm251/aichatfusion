import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Robot, Copy, Clock, CheckCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  onCopy?: (content: string) => void;
}

export function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;
  const hasError = !!message.error;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getBubbleStyles = () => {
    if (isUser) {
      return 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg border-primary/20';
    }
    
    // Different colors for different AI services with gradients
    switch (message.source) {
      case 'perplexity':
        return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-blue-200';
      case 'gemini':
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg border-emerald-200';
      case 'spark-llm':
        return 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-purple-200';
      default:
        return 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 shadow-lg border-slate-200';
    }
  };

  const getIcon = () => {
    if (isUser) return <User className="w-5 h-5" weight="fill" />;
    
    // Different icons based on AI service
    switch (message.source) {
      case 'perplexity':
        return <Robot className="w-5 h-5 text-blue-500" weight="fill" />;
      case 'gemini':
        return <Robot className="w-5 h-5 text-emerald-500" weight="fill" />;
      case 'spark-llm':
        return <Robot className="w-5 h-5 text-purple-500" weight="fill" />;
      default:
        return <Robot className="w-5 h-5" weight="fill" />;
    }
  };

  const getSourceBadge = () => {
    if (isUser || !message.source) return null;
    
    const getServiceInfo = (source: string) => {
      switch (source) {
        case 'perplexity':
          return { name: 'Perplexity AI', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        case 'gemini':
          return { name: 'Google Gemini', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        case 'spark-llm':
          return { name: 'Spark LLM', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        default:
          return { name: source, color: 'bg-slate-100 text-slate-700 border-slate-200' };
      }
    };
    
    const serviceInfo = getServiceInfo(message.source);
    
    return (
      <div className={cn(
        'px-2 py-1 rounded-full text-xs font-medium border',
        serviceInfo.color
      )}>
        {serviceInfo.name}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex gap-4 group',
        isUser ? 'justify-end' : 'justify-start',
        isUser ? 'ml-8' : 'mr-8'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md border-2 border-white flex items-center justify-center">
          {getIcon()}
        </div>
      )}
      
      <div className={cn('flex flex-col gap-2 max-w-[75%]', isUser && 'items-end')}>
        {!isUser && (
          <div className="flex items-center gap-3">
            {getSourceBadge()}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
        
        <div className="relative group/message">
          <Card className={cn(
            'p-4 shadow-lg transition-all duration-200 border-0',
            getBubbleStyles(),
            hasError && 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-200',
            'group-hover:shadow-xl transform group-hover:scale-[1.02]'
          )}>
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm opacity-90">AI is thinking...</span>
              </div>
            ) : hasError ? (
              <div className="text-sm">
                <div className="font-semibold">⚠️ Error occurred</div>
                <div className="text-xs opacity-80 mt-2 bg-black/10 rounded p-2">{message.error}</div>
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
            )}
          </Card>
          
          {!isLoading && !hasError && onCopy && (
            <Button
              onClick={handleCopy}
              size="sm"
              variant="ghost"
              className={cn(
                "absolute -top-2 -right-2 opacity-0 group-hover/message:opacity-100 transition-all duration-200",
                "bg-white/90 hover:bg-white shadow-md border h-8 w-8 p-0 rounded-full",
                isCopied && "bg-green-50 border-green-200"
              )}
              title={isCopied ? "Copied!" : "Copy message"}
            >
              {isCopied ? (
                <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
              ) : (
                <Copy className="w-4 h-4 text-slate-600" />
              )}
            </Button>
          )}
        </div>
        
        {isUser && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-md border-2 border-white flex items-center justify-center">
          {getIcon()}
        </div>
      )}
    </motion.div>
  );
}