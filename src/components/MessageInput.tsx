import { lazy, Suspense, useState, KeyboardEvent, useEffect, useRef, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, Ban, Sparkles, Layers, Settings, Database, Image, ChevronDown, Upload } from 'lucide-react';
const ModelSelectionDialog = lazy(() => import('./ModelSelectionDialog').then(module => ({ default: module.ModelSelectionDialog })));
import { AIService, ConsensusResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ConsensusButton } from './ConsensusButton';
import { toast } from 'sonner';

interface MessageInputProps {
  onSendMessage: (message: string, strategy?: 'fast' | 'comprehensive' | 'consensus', selectedModels?: AIService[]) => Promise<ConsensusResponse | void>;
  onGenerateImage?: (prompt: string, imageDataUrl?: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  onOpenPanel?: (panel: 'knowledge' | 'image') => void;
}

type ChatStrategy = 'fast' | 'comprehensive' | 'consensus';

function getStrategyLabel(strategy: ChatStrategy): string {
  if (strategy === 'fast') return 'Quick';
  if (strategy === 'consensus') return 'Consensus';
  return 'Multi-AI';
}

export const MessageInput = memo(function MessageInput({
  onSendMessage,
  onGenerateImage,
  disabled = false,
  placeholder = "Type your message...",
  onOpenPanel
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [inputMode, setInputMode] = useState<'chat' | 'image'>('chat');
  const [strategy, setStrategy] = useState<ChatStrategy>('comprehensive');
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [selectedModels, setSelectedModels] = useState<AIService[]>([]);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [lastConsensus, setLastConsensus] = useState<ConsensusResponse | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputModeLabel = inputMode === 'image' ? 'Image Mode' : 'Chat Mode';
  const strategyLabel = getStrategyLabel(strategy);
  const aiSetupSummary = strategy === 'fast'
    ? 'Quick'
    : `${strategyLabel} | ${selectedModels.length} service${selectedModels.length === 1 ? '' : 's'}`;
  const inputPlaceholder = inputMode === 'image'
    ? 'Describe the image you want to generate...'
    : placeholder;

  useEffect(() => {
    if (inputMode === 'image') {
      setShowModelSelection(false);
    }
  }, [inputMode]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) return;

    if (inputMode === 'image') {
      if (!onGenerateImage) return;

      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      const imageToSend = imageDataUrl ?? undefined;
      setImageDataUrl(null);
      setImageFilename(null);
      await onGenerateImage(trimmedMessage, imageToSend);
      return;
    }

    if ((strategy === 'comprehensive' || strategy === 'consensus') && selectedModels.length === 0) {
      setShowModelSelection(true);
      toast.info('Choose AI services in AI Setup.');
      return;
    }

    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (strategy === 'consensus') {
      setConsensusLoading(true);
      try {
        const result = await onSendMessage(trimmedMessage, strategy, selectedModels);
        setLastConsensus(result && result.success ? result : null);
      } finally {
        setConsensusLoading(false);
      }
      return;
    }

    await onSendMessage(
      trimmedMessage,
      strategy,
      strategy === 'comprehensive' ? selectedModels : undefined,
    );
  }, [message, disabled, inputMode, strategy, selectedModels, imageDataUrl, onGenerateImage, onSendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleModelSelection = useCallback((selection: { strategy: ChatStrategy; models: AIService[] }) => {
    setStrategy(selection.strategy);
    setSelectedModels(selection.models);
  }, []);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const maxHeight = 220;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  useEffect(() => {
    autoResize(textareaRef.current);
  }, [message]);

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setImageDataUrl(null);
      setImageFilename(null);
      toast.error('Image size must be less than 10MB');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setImageFilename(file.name);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, []);

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClearImage = useCallback(() => {
    setImageDataUrl(null);
    setImageFilename(null);
  }, []);

  return (
    <>
      <div className="p-4 xs:p-6 border-t border-border/70 bg-card/85 shadow-lg rounded-t-2xl panel-surface chat-composer backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-5xl mx-auto">
          {inputMode === 'chat' && strategy === 'consensus' && (
            <div className="mb-4">
              <ConsensusButton
                onClick={handleSend}
                loading={consensusLoading}
                confidence={lastConsensus?.confidence}
                contributingModels={lastConsensus?.contributingModels}
                disabled={disabled || !message.trim() || selectedModels.length === 0}
              />
            </div>
          )}

          <div className="flex flex-col xl:flex-row gap-2 xs:gap-3 items-stretch xl:items-center">
            <div className="flex-1 relative min-w-0">
              <Textarea
                id="message-input"
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={handleKeyDown}
                placeholder={disabled ? "AI is thinking..." : inputPlaceholder}
                disabled={disabled}
                rows={1}
                className="min-h-[48px] xs:min-h-[40px] max-h-[220px] px-4 pr-12 sm:pr-14 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-sm [font-size:16px] w-full chat-input-field resize-none"
                autoComplete="off"
              />
              {disabled && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 xl:flex xl:flex-wrap items-stretch gap-2 w-full xl:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full xs:min-w-[140px] xl:flex-none xl:w-36 h-12 rounded-full border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-sm chat-select justify-between"
                  >
                    <span className="text-sm">{inputModeLabel}</span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52">
                  <DropdownMenuLabel>Input</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={inputMode}
                    onValueChange={(value) => setInputMode(value as 'chat' | 'image')}
                  >
                    <DropdownMenuRadioItem value="chat">
                      <Layers className="w-4 h-4 text-blue-500" />
                      <span>Chat</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="image">
                      <Image className="w-4 h-4 text-purple-500" />
                      <span>Image</span>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>

                  {onOpenPanel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Tools</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onOpenPanel('knowledge')}>
                        <Database className="w-4 h-4" />
                        <span>Knowledge Base</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenPanel('image')}>
                        <Image className="w-4 h-4" />
                        <span>Image Studio</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {inputMode === 'chat' && (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-12 rounded-full border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-sm chat-select justify-between w-full xs:min-w-[170px] xl:min-w-[220px]",
                    strategy !== 'fast' && selectedModels.length > 0 && "border-green-500 text-green-700 dark:text-green-400"
                  )}
                  onClick={() => setShowModelSelection(true)}
                  aria-label="Open AI setup"
                >
                  <span className="text-sm truncate max-w-[180px]">{aiSetupSummary}</span>
                  <Settings className="h-4 w-4 opacity-70 flex-shrink-0" />
                </Button>
              )}

              {inputMode === 'image' && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                className={cn(
                    "h-12 w-12 rounded-full chat-icon-btn justify-self-start",
                    imageDataUrl ? "border-green-500 text-green-600" : ""
                  )}
                  onClick={handleImageUploadClick}
                  aria-label={imageDataUrl ? "Image attached" : "Upload image"}
                  title={imageDataUrl ? "Image attached" : "Upload image"}
                >
                  <Upload className="w-5 h-5" />
                </Button>
              )}
            </div>

            {inputMode === 'chat' && strategy !== 'consensus' && (
              <Button
                onClick={handleSend}
                disabled={disabled || !message.trim()}
                size="lg"
                className="h-12 xs:h-10 px-4 xs:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 w-full xl:min-w-[110px] xl:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {disabled ? (
                  <Ban className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span className="ml-2">
                  {disabled ? 'Thinking...' : 'Send'}
                </span>
              </Button>
            )}

            {inputMode === 'image' && (
              <Button
                onClick={handleSend}
                disabled={disabled || !message.trim()}
                size="lg"
                className="h-12 xs:h-10 px-4 xs:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 w-full xl:min-w-[110px] xl:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {disabled ? (
                  <Ban className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span className="ml-2">
                  {disabled ? 'Thinking...' : 'Generate'}
                </span>
              </Button>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-border/70 bg-background/60 px-2 py-2 text-left sm:text-center">
            <p className="text-xs text-muted-foreground break-words">
              Press Enter to send. Shift+Enter for a new line.{' '}
              {inputMode === 'image'
                ? imageFilename ? (
                  <span>
                    Attached: {imageFilename}
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="ml-2 text-red-500 hover:text-red-600 underline"
                    >
                      Remove
                    </button>
                  </span>
                ) : (
                  'Optional image upload for edits.'
                )
                : strategy === 'fast'
                  ? 'Quick mode uses sequential fallback.'
                  : selectedModels.length === 0
                    ? `${strategyLabel} mode is ready. Open AI Setup to choose services.`
                    : `${strategyLabel} mode with ${selectedModels.length} selected service${selectedModels.length === 1 ? '' : 's'}.`}
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <ModelSelectionDialog
          open={showModelSelection}
          onOpenChange={setShowModelSelection}
          onConfirm={handleModelSelection}
          initialSelection={selectedModels}
          initialStrategy={strategy}
        />
      </Suspense>
    </>
  );
});

