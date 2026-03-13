import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash, Sparkles, MessageCircleMore } from 'lucide-react';
import { ThemeToggle } from './ui/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SettingsDialog = lazy(() => import('./SettingsDialog').then(module => ({ default: module.SettingsDialog })));
const CreditsDialog = lazy(() => import('./CreditsDialog').then(module => ({ default: module.CreditsDialog })));
const BlogDialog = lazy(() => import('./BlogDialog').then(module => ({ default: module.BlogDialog })));

interface ChatHeaderProps {
  messageCount: number;
  onClearHistory: () => void;
  onDeleteAllChats?: () => void;
  isLoading?: boolean;
}

export function ChatHeader({ messageCount, onClearHistory, onDeleteAllChats, isLoading }: ChatHeaderProps) {
  const statusLabel = isLoading ? 'Thinking' : 'Ready';
  const statusColor = isLoading ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/70 bg-background/90 backdrop-blur-md header-surface">
      <div className="mx-auto flex h-[3.5rem] sm:h-[3.75rem] max-w-7xl items-center justify-between gap-2 px-2 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SidebarTrigger className="flex-shrink-0" />
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary sm:flex">
              <MessageCircleMore className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold sm:text-base font-display header-title-gradient section-title">
                AI Chat Fusion
              </h1>
              <p className="hidden text-[11px] text-muted-foreground md:block">
                Multi-model chat workspace
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] text-muted-foreground lg:inline-flex"
            role="status"
            aria-live="polite"
          >
            <span className={`h-2 w-2 rounded-full ${statusColor} ${isLoading ? 'animate-pulse' : ''}`} />
            {statusLabel}
          </div>

          <Badge variant="secondary" className="hidden border-border/70 bg-card/70 md:inline-flex">
            {messageCount} {messageCount === 1 ? 'message' : 'messages'}
          </Badge>

          {messageCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-8 border border-border/60 bg-card/60 text-xs md:inline-flex"
              onClick={onClearHistory}
              disabled={isLoading}
            >
              Clear Chat
            </Button>
          )}

          <Suspense fallback={<Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-md" />}>
            <BlogDialog />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-md" />}>
            <SettingsDialog />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-md" />}>
            <CreditsDialog />
          </Suspense>
          <ThemeToggle />

          {messageCount > 0 && onDeleteAllChats && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:h-9 sm:w-9"
                  disabled={isLoading}
                  aria-label="Delete all chats"
                  title="Delete all chats"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all chat history</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes all saved conversations and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteAllChats}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isLoading && <Sparkles className="hidden h-4 w-4 text-primary animate-pulse lg:block" />}
        </div>
      </div>
    </header>
  );
}
