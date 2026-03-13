import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsensusButtonProps {
  onClick: () => void;
  loading?: boolean;
  confidence?: number;
  contributingModels?: string[];
  disabled?: boolean;
}

export function ConsensusButton({ 
  onClick, 
  loading = false, 
  confidence,
  contributingModels = [],
  disabled = false 
}: ConsensusButtonProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-500';
    if (conf >= 0.6) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.8) return 'High Consensus';
    if (conf >= 0.6) return 'Moderate Consensus';
    return 'Low Consensus';
  };

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onClick}
              disabled={disabled || loading}
              variant="outline"
              className={cn(
                "w-full h-12 rounded-xl border transition-all duration-200 shadow-sm text-xs sm:text-sm",
                "bg-gradient-to-r from-primary/10 to-accent/10",
                "hover:from-primary/20 hover:to-accent/20",
                "border-primary/30 hover:border-primary/50",
                loading && "animate-pulse"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span className="truncate">Generating Consensus...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  <span className="truncate">Generate Consensus Answer</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Analyze responses from multiple AI models and create a unified answer</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {confidence !== undefined && (
        <div 
          className="px-3 py-2 rounded-lg border border-border/70 bg-background/70 space-y-2 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Consensus Confidence
            </span>
            <span className={cn("text-sm font-bold", getConfidenceColor(confidence))}>
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          
          <Progress value={confidence * 100} className="h-2" />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{getConfidenceLabel(confidence)}</span>
            <span>{contributingModels.length} models</span>
          </div>

          {showDetails && contributingModels.length > 0 && (
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Contributing Models:</p>
              <div className="flex flex-wrap gap-1">
                {contributingModels.map((model, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-xs rounded-full bg-background border"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
