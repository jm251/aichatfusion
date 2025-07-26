import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash, Robot, Lightbulb, CheckCircle } from '@phosphor-icons/react';
import { AIService } from '@/lib/ai-service';
import { SettingsDialog } from './SettingsDialog';

interface ChatHeaderProps {
  messageCount: number;
  onClearHistory: () => void;
  isLoading?: boolean;
}

export function ChatHeader({ messageCount, onClearHistory, isLoading }: ChatHeaderProps) {
  const [configuredServices, setConfiguredServices] = useState({
    perplexity: false,
    gemini: false,
    sparkLLM: true
  });

  useEffect(() => {
    const updateServices = () => {
      const services = AIService.getConfiguredServices();
      setConfiguredServices(services);
    };
    
    updateServices();
    
    // Update services when dialog closes (settings change)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateServices();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const getServiceStatus = () => {
    const services = [];
    if (configuredServices.perplexity) services.push('Perplexity');
    if (configuredServices.gemini) services.push('Gemini');
    if (configuredServices.sparkLLM) services.push('Spark LLM');
    
    return services.length > 0 ? services.join(' + ') : 'No services configured';
  };

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
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lightbulb className="w-3 h-3" />
            <span>{getServiceStatus()}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {configuredServices.perplexity && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <CheckCircle className="w-2 h-2" />
                Perplexity
              </Badge>
            )}
            {configuredServices.gemini && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <CheckCircle className="w-2 h-2" />
                Gemini
              </Badge>
            )}
            {configuredServices.sparkLLM && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <CheckCircle className="w-2 h-2" />
                Spark
              </Badge>
            )}
          </div>
        </div>
        
        <SettingsDialog />
        
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