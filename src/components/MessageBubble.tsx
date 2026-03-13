import { memo, useState } from 'react';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { User, Bot, Copy, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useTheme } from '@/components/theme-provider';

interface MessageBubbleProps {
  message: Message;
  onCopy?: (content: string) => void;
}

type ServiceMeta = {
  label: string;
  badge: string;
  accentBorder: string;
  icon: string;
  avatarBorder: string;
};

const SERVICE_META: Record<string, ServiceMeta> = {
  groq: {
    label: 'Groq',
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700',
    accentBorder: 'border-l-orange-300 dark:border-l-orange-700',
    icon: 'text-orange-500 dark:text-orange-300',
    avatarBorder: 'border-orange-200 dark:border-orange-700'
  },
  gemini: {
    label: 'Gemini',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-700',
    accentBorder: 'border-l-emerald-300 dark:border-l-emerald-700',
    icon: 'text-emerald-500 dark:text-emerald-300',
    avatarBorder: 'border-emerald-200 dark:border-emerald-700'
  },
  openai: {
    label: 'OpenAI',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:border-indigo-700',
    accentBorder: 'border-l-indigo-300 dark:border-l-indigo-700',
    icon: 'text-indigo-500 dark:text-indigo-300',
    avatarBorder: 'border-indigo-200 dark:border-indigo-700'
  },
  openrouter: {
    label: 'OpenRouter',
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-100 dark:border-violet-700',
    accentBorder: 'border-l-violet-300 dark:border-l-violet-700',
    icon: 'text-violet-500 dark:text-violet-300',
    avatarBorder: 'border-violet-200 dark:border-violet-700'
  },
  github: {
    label: 'GitHub',
    badge: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700',
    accentBorder: 'border-l-slate-300 dark:border-l-slate-700',
    icon: 'text-slate-500 dark:text-slate-300',
    avatarBorder: 'border-slate-200 dark:border-slate-700'
  },
  cohere: {
    label: 'Cohere',
    badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900 dark:text-sky-100 dark:border-sky-700',
    accentBorder: 'border-l-sky-300 dark:border-l-sky-700',
    icon: 'text-sky-500 dark:text-sky-300',
    avatarBorder: 'border-sky-200 dark:border-sky-700'
  },
  system: {
    label: 'System',
    badge: 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700',
    accentBorder: 'border-l-neutral-300 dark:border-l-neutral-700',
    icon: 'text-neutral-500 dark:text-neutral-300',
    avatarBorder: 'border-neutral-200 dark:border-neutral-700'
  },
  xai: {
    label: 'xAI',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900 dark:text-rose-100 dark:border-rose-700',
    accentBorder: 'border-l-rose-300 dark:border-l-rose-700',
    icon: 'text-rose-500 dark:text-rose-300',
    avatarBorder: 'border-rose-200 dark:border-rose-700'
  },
  fastrouter: {
    label: 'Anthropic',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-700',
    accentBorder: 'border-l-amber-300 dark:border-l-amber-700',
    icon: 'text-amber-500 dark:text-amber-300',
    avatarBorder: 'border-amber-200 dark:border-amber-700'
  },
  consensus: {
    label: 'Consensus',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-700',
    accentBorder: 'border-l-yellow-300 dark:border-l-yellow-700',
    icon: 'text-yellow-500 dark:text-yellow-300',
    avatarBorder: 'border-yellow-200 dark:border-yellow-700'
  },
  default: {
    label: 'AI',
    badge: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700',
    accentBorder: 'border-l-slate-200 dark:border-l-slate-700',
    icon: 'text-slate-500 dark:text-slate-300',
    avatarBorder: 'border-slate-200 dark:border-slate-700'
  }
};

export const MessageBubble = memo(function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.role === 'user';
  const isLoading = 'isLoading' in message ? message.isLoading : false;
  const hasError = 'error' in message ? !!message.error : false;
  const source = 'source' in message ? message.source : undefined;
  const meta = SERVICE_META[source || 'default'] || SERVICE_META.default;
  const { theme } = useTheme();
  const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;
  const isDarkTheme = isUser || resolvedTheme === 'dark';

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopy = async () => {
    if (!onCopy) return;
    onCopy(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isVeryLong =
    (message.content?.length ?? 0) > 6000 ||
    ((message.content?.match(/\n/g)?.length ?? 0) > 200);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex gap-3 xs:gap-4 group w-full',
        isUser ? 'justify-end' : 'justify-start',
        isUser ? 'xs:ml-8' : 'xs:mr-8'
      )}
    >
      {!isUser && (
        <div className={cn(
          'flex-shrink-0 w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-background shadow-sm border flex items-center justify-center',
          meta.avatarBorder
        )}>
          <Bot className={cn('w-5 h-5', meta.icon)} />
        </div>
      )}

      <div className={cn(
        'flex flex-col gap-2 min-w-0 flex-1',
        isUser ? 'items-end max-w-[92%] sm:max-w-[85%] lg:max-w-[75%]' : 'items-start max-w-[calc(100%-2.8rem)] xs:max-w-[calc(100%-4rem)]'
      )}>
        {!isUser && (
          <div className="flex items-center gap-2 xs:gap-3 flex-wrap">
            <div className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', meta.badge)}>
              {meta.label}
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(Number(message.timestamp))}
            </span>
          </div>
        )}

        <div className="relative w-full">
          <div
            className={cn(
              'chat-bubble relative w-full overflow-hidden transition-all',
              isUser ? 'chat-bubble-user' : 'chat-bubble-ai',
              !isUser && `border-l-4 ${meta.accentBorder}`
            )}
          >
            <span className="chat-bubble-glow" />
            {isLoading ? (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm opacity-90 break-words">
                  {'loadingService' in message && message.loadingService === 'fast'
                    ? 'AI is processing your request...'
                    : 'loadingService' in message && message.loadingService
                      ? `${(message as any).loadingService.charAt(0).toUpperCase() + (message as any).loadingService.slice(1)} is thinking...`
                      : 'AI is thinking...'
                  }
                </span>
              </div>
            ) : hasError ? (
              <div className="px-4 py-3">
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Response failed</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {message.error || 'The model did not return a valid response.'}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'text-sm leading-relaxed px-4 py-3',
                  isVeryLong ? 'max-h-[70vh] overflow-y-auto overscroll-contain pr-2 -mr-2' : ''
                )}
              >
                {message.imageUrl && (
                  <div className="mb-3">
                    <img
                      src={message.imageUrl}
                      alt={message.content ? message.content : 'Image'}
                      loading="lazy"
                      className="w-full max-h-[60vh] rounded-lg shadow-lg object-contain"
                    />
                  </div>
                )}
                {message.content?.trim() && (
                  <MarkdownRenderer
                    content={message.content}
                    isDark={isDarkTheme}
                    className="max-w-none"
                  />
                )}
              </div>
            )}
          </div>

          {!isLoading && !hasError && onCopy && (
            <Button
              onClick={handleCopy}
              size="sm"
              variant="ghost"
              aria-label={isCopied ? 'Copied' : 'Copy message'}
              className={cn(
                'absolute top-1 right-1 transition-all duration-200',
                'bg-background hover:bg-muted shadow-md border h-8 w-8 p-0 rounded-full',
                'hover-reveal',
                isCopied && 'bg-emerald-50 border-emerald-200 opacity-100'
              )}
              title={isCopied ? 'Copied' : 'Copy message'}
            >
              {isCopied ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-slate-600" />
              )}
            </Button>
          )}
        </div>

        {isUser && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(Number(message.timestamp))}
            </span>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 shadow-md border border-white/40 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </motion.div>
  );
});
