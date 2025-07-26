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
    groq: false,
    perplexity: false,
    gemini: false,
    openrouter: false,
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
    if (configuredServices.groq) services.push('Groq');
    if (configuredServices.perplexity) services.push('Perplexity');
    if (configuredServices.gemini) services.push('Gemini');
    if (configuredServices.openrouter) services.push('OpenRouter');
    if (configuredServices.sparkLLM) services.push('Spark LLM');
    
    return services.length > 0 ? services.join(' + ') : 'No services configured';
  };

  return (
    <div className="flex items-center justify-between p-6 border-b bg-white/80 backdrop-blur-lg shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
            <Robot className="w-6 h-6 text-white" weight="fill" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Chat Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by multiple AI services</p>
          </div>
        </div>
        {messageCount > 0 && (
          <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
            {messageCount} messages
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>AI thinking...</span>
          </div>
        )}
        
        <div className="hidden md:flex items-center gap-2">
          {configuredServices.groq && (
            <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" weight="fill" />
              Groq ⚡
            </div>
          )}
          {configuredServices.perplexity && (
            <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" weight="fill" />
              Perplexity 🌐
            </div>
          )}
          {configuredServices.gemini && (
            <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" weight="fill" />
              Gemini 🧐
            </div>
          )}
          {configuredServices.openrouter && (
            <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" weight="fill" />
              OpenRouter 🎯
            </div>
          )}
          {configuredServices.sparkLLM && (
            <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" weight="fill" />
              Spark LLM 🔄
            </div>
          )}
        </div>
        
        <SettingsDialog />
        
        {messageCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHistory}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            disabled={isLoading}
          >
            <Trash className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Clear</span>
          </Button>
        )}
      </div>
    </div>
  );
}