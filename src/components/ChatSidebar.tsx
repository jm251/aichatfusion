import { memo, useState, useEffect } from 'react';
import { FirebaseChat } from '@/lib/types';
import { FirebaseService } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { MessageCircle, Plus, User, Trash, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatSidebarProps {
  userId: string | null;
  currentChatId: string | null;
  storageMode?: 'local' | 'cloud';
  onSelectChat: (chatId: string | null) => void;
  onNewChat: () => void;
}

export const ChatSidebar = memo(function ChatSidebar({
  userId,
  currentChatId,
  storageMode = 'local',
  onSelectChat,
  onNewChat,
}: ChatSidebarProps) {
  const [chats, setChats] = useState<FirebaseChat[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = FirebaseService.subscribeToUserChats(userId, (updatedChats) => {
      setChats(updatedChats);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const formatChatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      await FirebaseService.deleteChat(chatToDelete);
      toast.success('Chat deleted');
      if (chatToDelete === currentChatId) {
        onSelectChat(null);
        onNewChat();
      }
    } catch (error) {
      toast.error('Failed to delete chat');
    }

    setChatToDelete(null);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border/70 bg-card/65 backdrop-blur-sm panel-surface">
        <SidebarHeader className="gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <MessageCircle className="h-4 w-4" />
              </div>
              <span className="truncate font-semibold section-title group-data-[collapsible=icon]:hidden">Conversations</span>
            </div>
            <Button
              size="sm"
              onClick={onNewChat}
              className="gap-1.5 group-data-[collapsible=icon]:hidden"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {userId && (
            <div className="rounded-xl border border-border/70 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Anonymous User</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {storageMode === 'cloud'
                  ? 'Chats sync to cloud storage'
                  : 'Chats are stored on this device'}
              </p>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="px-2 pb-2">
          <div className="px-2 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium group-data-[collapsible=icon]:hidden">
            Recent
          </div>
          <SidebarMenu className="mt-1">
            {chats.length === 0 ? (
              <div className="mx-1 mt-3 rounded-xl border border-dashed border-border/70 bg-background/60 p-5 text-center text-muted-foreground group-data-[collapsible=icon]:hidden">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium">No chats yet</p>
                <p className="mt-1 text-xs">Start your first conversation.</p>
              </div>
            ) : (
              chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <div
                    className="relative group"
                  >
                    <SidebarMenuButton
                      onClick={() => onSelectChat(chat.id)}
                      isActive={currentChatId === chat.id}
                      className={cn(
                        "h-auto w-full gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors",
                        currentChatId === chat.id
                          ? "border-primary/35 bg-primary/10"
                          : "hover:border-border/70 hover:bg-background/70"
                      )}
                      tooltip={chat.title}
                    >
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                        <p className="truncate text-sm font-medium">{chat.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{chat.messages.length} messages</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {formatChatDate(chat.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </SidebarMenuButton>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className={cn(
                        "absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-0",
                        "hover:bg-destructive/10 hover:text-destructive",
                        "group-data-[collapsible=icon]:hidden",
                        "opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                      )}
                      aria-label="Delete chat"
                      title="Delete chat"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat</AlertDialogTitle>
            <AlertDialogDescription>
              This chat will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
