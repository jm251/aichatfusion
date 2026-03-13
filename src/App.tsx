import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Message, ConsensusResponse, AIService as AIServiceType } from '@/lib/types';
import { AIService } from '@/lib/ai-service';
import { ImageGenerationService } from '@/lib/image-generation-service';
import { APIBackendClient } from '@/lib/api-backend-client';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatHistory } from '@/components/ChatHistory';
import { MessageInput } from '@/components/MessageInput';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { FirebaseService } from '@/lib/firebase-service';
import { ChatSidebar } from '@/components/ChatSidebar';
import {
  SidebarProvider,
  SidebarInset
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ThemeWrapper } from '@/components/ThemeWrapper';
import { useBreakpoint } from '@/hooks/use-mobile';
import { X } from 'lucide-react';

const KnowledgeUpload = lazy(() => import('@/components/KnowledgeUpload').then(module => ({ default: module.KnowledgeUpload })));
const ImageGeneration = lazy(() => import('@/components/ImageGeneration').then(module => ({ default: module.ImageGeneration })));

const tabTriggerClass = "text-xs sm:text-sm rounded-lg border border-transparent bg-transparent data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none";

function SidePanelContent({ userId, value, onValueChange }: {
  userId: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const tabsProps = value !== undefined
    ? { value, onValueChange }
    : { defaultValue: 'knowledge' };

  return (
    <Tabs {...tabsProps} className="h-full flex flex-col min-h-0">
      <div className="border-b border-border/60 px-3 pt-3 pb-2 surface-enter">
        <h2 className="text-sm font-semibold font-display section-title">Workspace Tools</h2>
        <p className="text-xs section-subtitle">Use knowledge and image tools without leaving chat.</p>
      </div>
      <TabsList className="mx-3 mt-3 rounded-xl border border-border/70 bg-card/60 p-1 shadow-none flex-shrink-0 grid grid-cols-2 h-10">
        <TabsTrigger value="knowledge" className={`${tabTriggerClass} px-2`}>
          Knowledge Base
        </TabsTrigger>
        <TabsTrigger value="image" className={`${tabTriggerClass} px-2`}>
          Image Studio
        </TabsTrigger>
      </TabsList>

      <TabsContent value="knowledge" className="flex-1 overflow-hidden p-3 sm:p-4 m-0 min-h-0">
        <Suspense fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        }>
          <div className="h-full rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm">
            <KnowledgeUpload
              userId={userId}
              onKnowledgeUpdate={() => { toast.success('Knowledge base updated'); }}
            />
          </div>
        </Suspense>
      </TabsContent>

      <TabsContent value="image" className="flex-1 overflow-hidden p-3 sm:p-4 m-0 min-h-0">
        <Suspense fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        }>
          <div className="h-full rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm">
            <ImageGeneration />
          </div>
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState<'knowledge' | 'image'>('knowledge');
  const mobilePanelCloseRef = useRef<HTMLButtonElement>(null);
  const lastSendArgsRef = useRef<{ content: string; strategy: 'fast' | 'comprehensive' | 'consensus'; selectedModels?: AIServiceType[] } | null>(null);
  const breakpoint = useBreakpoint();
  const showSidePanel = useMemo(() => breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl' || breakpoint === '3xl', [breakpoint]);

  // Initialize Firebase on mount
  useEffect(() => {
    const initFirebase = async () => {
      await FirebaseService.initialize();
      const uid = await FirebaseService.getCurrentUserId();
      setUserId(uid);
      setStorageMode(FirebaseService.getStorageMode());
    };
    initFirebase();
  }, []);

  const handleSendMessage = async (
    content: string,
    strategy: 'fast' | 'comprehensive' | 'consensus' = 'comprehensive',
    selectedModels?: AIServiceType[]
  ): Promise<ConsensusResponse | void> => {
    if (!content.trim() || isLoading) return;

    lastSendArgsRef.current = { content, strategy, selectedModels };

    const userMessage: Message = {
      id: generateId(),
      content: content.trim(),
      role: 'user',
      timestamp: Date.now()
    };

    // Add user message immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Save or update chat in Firebase
    if (!currentChatId && userId) {
      const chatId = await FirebaseService.saveChat(updatedMessages);
      if (chatId) setCurrentChatId(chatId);
    } else if (currentChatId) {
      await FirebaseService.updateChat(currentChatId, updatedMessages);
    }

    // Handle consensus strategy
    if (strategy === 'consensus') {
      try {
        // Create a single loading message for consensus
        const consensusLoadingMessage: Message = {
          id: `loading-consensus-${Date.now()}`,
          content: 'Generating consensus from multiple AI models...',
          role: 'assistant',
          timestamp: Date.now(),
          source: 'consensus',
          isLoading: true
        };

        setMessages(currentMessages => [...currentMessages, consensusLoadingMessage]);

        // Generate consensus response
        const consensusResponse = await AIService.generateConsensusResponse(
          content,
          (service, status, response) => {
            // Optional: Update UI with individual service status
            // console.log(`${service}: ${status}`);
          },
          selectedModels,
          userId ?? undefined
        );

        // Update messages - remove loading and add consensus message on success
        setMessages(currentMessages => {
          const withoutLoading = currentMessages.filter(msg => !msg.isLoading);

          if (!consensusResponse.success || !consensusResponse.content) {
            return withoutLoading;
          }

          const consensusMessage: Message = {
            id: generateId(),
            content: consensusResponse.content,
            role: 'assistant',
            timestamp: Date.now(),
            source: 'consensus',
            error: undefined,
          };

          const finalMessages = [...withoutLoading, consensusMessage];

          // Update Firebase
          if (currentChatId) {
            FirebaseService.updateChat(currentChatId, finalMessages);
          }

          return finalMessages;
        });

        // Show toast with confidence
        if (consensusResponse.success) {
          const confidencePercent = Math.round(consensusResponse.confidence * 100);
          toast.success(`Consensus generated with ${confidencePercent}% confidence from ${consensusResponse.contributingModels.length} models`);
        } else {
          toast.error('Failed to generate consensus');
        }

        setIsLoading(false);
        return consensusResponse.success ? consensusResponse : undefined;
      } catch (error) {
        console.error('Error generating consensus:', error);
        setMessages(currentMessages => currentMessages.filter(msg => !msg.isLoading));
        toast.error('Failed to generate consensus');
        setIsLoading(false);
        return;
      }
    }

    // Create loading message placeholders based on strategy (for fast and comprehensive)
    const loadingMessages: Message[] = [];
    if (strategy === 'comprehensive') {
      // Get configured services to create appropriate loading messages
      try {
        const configuredServices = await AIService.getConfiguredServices();
        // Only create loading messages for selected services
        const shouldCreateLoading = (service: AIServiceType) => {
          if (selectedModels && selectedModels.length > 0) {
            return selectedModels.includes(service) && configuredServices[service];
          }
          return configuredServices[service];
        };

        const now = Date.now();
        if (APIBackendClient.isProxyMode()) {
          const loadingTargets = AIService.getProxyLoadingTargets(selectedModels).filter(
            target => configuredServices[target.service as keyof typeof configuredServices]
          );

          loadingTargets.forEach((target, index) => {
            loadingMessages.push({
              id: `loading-${target.id}-${now}-${index}`,
              content: '',
              role: 'assistant',
              timestamp: now,
              source: target.service as Message['source'],
              isLoading: true,
              loadingService: target.id
            });
          });
        } else {
          const allServices: AIServiceType[] = ['groq', 'gemini', 'openai', 'openrouter', 'github', 'cohere', 'xai', 'fastrouter'];
          for (const service of allServices) {
            if (shouldCreateLoading(service)) {
              loadingMessages.push({
                id: `loading-${service}-${now}`,
                content: '',
                role: 'assistant',
                timestamp: now,
                source: service,
                isLoading: true,
                loadingService: service
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to get configured services:', error instanceof Error ? error.message : String(error));
      }
    } else {
      // Fast mode - single loading message that can accept any service response
      loadingMessages.push({
        id: `loading-fast-${Date.now()}`,
        content: '',
        role: 'assistant',
        timestamp: Date.now(),
        isLoading: true,
        loadingService: 'fast' // Use 'fast' as a special identifier instead of specific service
      });
    }

    // Add loading messages
    setMessages(currentMessages => [...currentMessages, ...loadingMessages]);

    // Helper function to check if message should be updated
    const shouldUpdateMessage = (msg: Message, service: string, strategy: 'fast' | 'comprehensive'): boolean => {
      if (!msg.isLoading) return false;

      if (strategy === 'fast') {
        return msg.loadingService === 'fast';
      }

      return msg.loadingService === service;
    };

    // Helper function to create updated message
    const createUpdatedMessage = (msg: Message, response: any, isError: boolean): Message => {
      return {
        ...msg,
        id: generateId(),
        content: isError ? (response.content || 'Failed to get response') : response.content,
        source: response.source as 'groq' | 'gemini' | 'openai' | 'openrouter' | 'github' | 'cohere' | 'xai' | 'fastrouter' | 'system',
        model: response.model ?? msg.model,
        isLoading: false,
        error: isError ? response.error : (response.success ? undefined : response.error),
        loadingService: undefined
      };
    };

    // Helper function to update messages
    const updateMessageForResponse = (service: string, response: any, isError: boolean) => {
      setMessages(currentMessages =>
        currentMessages.map(msg => {
          if (shouldUpdateMessage(msg, service, strategy)) {
            return createUpdatedMessage(msg, response, isError);
          }
          return msg;
        })
      );
    };

    try {
      // Get AI responses with real-time updates and knowledge base context
      const aiResponses = await AIService.getAIResponses(
        content,
        strategy,
        (service, status, response) => {
          if (status === 'success' && response) {
            updateMessageForResponse(service, response, false);
          } else if (status === 'error' && response) {
            // Log error for debugging but don't show error message to user
            // console.error(`Error from ${service}:`, response.error);

            // Remove the loading message for this service instead of showing error
            setMessages(currentMessages =>
              currentMessages.filter(msg =>
                !(msg.isLoading && msg.loadingService === service)
              )
            );
          }
        },
        selectedModels,
        userId ?? undefined // Pass userId for knowledge base context
      );

      // After receiving all responses, update Firebase
      if (currentChatId) {
        // Get current messages state and filter properly
        setMessages(currentMessages => {
          const finalMessages = currentMessages.filter(msg =>
            !msg.isLoading && msg.content && msg.content.trim().length > 0
          );

          // Update Firebase with cleaned messages
          FirebaseService.updateChat(currentChatId, finalMessages);

          return currentMessages;
        });
      }

      // Handle any remaining loading messages (cleanup)
      setMessages(currentMessages =>
        currentMessages.filter(msg => !msg.isLoading)
      );

      // Only show success toasts, not error counts
      const successfulResponses = aiResponses.filter(r => r.success);
      if (successfulResponses.length === 0) {
        toast.info('No responses available at the moment.', {
          action: {
            label: 'Retry',
            onClick: () => {
              const args = lastSendArgsRef.current;
              if (args) handleSendMessage(args.content, args.strategy, args.selectedModels);
            }
          }
        });
      } else if (successfulResponses.length > 1) {
        toast.success(`${successfulResponses.length} AI perspectives provided`);
      } else {
        const source = successfulResponses[0].source;
        const sourceNames: Record<string, string> = {
          groq: 'Groq',
          gemini: 'Gemini',
          openai: 'OpenAI',
          openrouter: 'OpenRouter',
          github: 'GitHub Models',
          cohere: 'Cohere',
          xai: 'xAI',
          fastrouter: 'Anthropic'
        };
        toast.success(`Response from ${sourceNames[source] || source}`);
      }

    } catch (error) {
      console.error('Error getting AI response:', error);

      // Remove all loading messages without adding error message
      setMessages(currentMessages =>
        currentMessages.filter(msg => !msg.isLoading)
      );

      toast.error('Unable to get response.', {
        action: {
          label: 'Retry',
          onClick: () => {
            const args = lastSendArgsRef.current;
            if (args) handleSendMessage(args.content, args.strategy, args.selectedModels);
          }
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = useCallback(async (chatId: string | null) => {
    if (!chatId) return;

    // Load messages from selected chat
    const chat = await FirebaseService.getChatById(chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      toast.success('Chat history cleared');
      return [];
    });
    setCurrentChatId(null);
  }, []);

  const handleDeleteAllChats = useCallback(async () => {
    if (!userId) return;

    try {
      const chats = await FirebaseService.getAllUserChats(userId);
      const deletePromises = chats.map(chat => FirebaseService.deleteChat(chat.id));
      await Promise.all(deletePromises);

      setMessages([]);
      setCurrentChatId(null);

      toast.success('All chat history deleted');
    } catch (error) {
      console.error('Error deleting all chats:', error);
      toast.error('Failed to delete all chats');
    }
  }, [userId]);

  const handleOpenMobilePanel = useCallback((tab: 'knowledge' | 'image') => {
    setMobilePanelTab(tab);
    setMobilePanelOpen(true);
  }, []);

  const handleGenerateImage = async (prompt: string, imageDataUrl?: string) => {
    if (!prompt.trim() || isLoading) return;

    const timestamp = Date.now();
    const userMessage: Message = {
      id: generateId(),
      content: prompt.trim(),
      role: 'user',
      timestamp,
      imageUrl: imageDataUrl
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    if (!currentChatId && userId) {
      const chatId = await FirebaseService.saveChat(updatedMessages);
      if (chatId) setCurrentChatId(chatId);
    } else if (currentChatId) {
      await FirebaseService.updateChat(currentChatId, updatedMessages);
    }

    const loadingMessage: Message = {
      id: `loading-image-${timestamp}`,
      content: 'Generating image...',
      role: 'assistant',
      timestamp: Date.now(),
      source: 'openai',
      isLoading: true,
      loadingService: 'image'
    };

    setMessages(currentMessages => [...currentMessages, loadingMessage]);

    try {
      const response = await ImageGenerationService.generateImage({
        prompt: prompt.trim(),
        image: imageDataUrl,
        model: 'openai/dall-e-3'
      });

      setMessages(currentMessages => {
        const withoutLoading = currentMessages.filter(msg => msg.id !== loadingMessage.id);

        if (!response.success || (!response.imageUrl && !response.imageData)) {
          return withoutLoading;
        }

        const imageUrl = response.imageUrl || (response.imageData ? `data:image/png;base64,${response.imageData}` : undefined);
        const assistantMessage: Message = {
          id: generateId(),
          content: response.text || '',
          role: 'assistant',
          timestamp: Date.now(),
          source: 'openai',
          imageUrl
        };

        const finalMessages = [...withoutLoading, assistantMessage];

        if (currentChatId) {
          FirebaseService.updateChat(currentChatId, finalMessages);
        }

        return finalMessages;
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to generate image');
      } else {
        toast.success('Image generated successfully');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setMessages(currentMessages => currentMessages.filter(msg => msg.id !== loadingMessage.id));
      toast.error('Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!mobilePanelOpen) return;
    const focusTimer = setTimeout(() => {
      mobilePanelCloseRef.current?.focus();
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [mobilePanelOpen]);

  return (
    <ThemeWrapper>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen w-full transition-colors duration-200 flex overflow-hidden bg-background text-foreground app-shell-gradient">
            <ChatSidebar
              userId={userId}
              currentChatId={currentChatId}
              storageMode={storageMode}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />

          <SidebarInset className="flex-1 flex flex-col min-w-0 bg-background text-foreground">
            <ChatHeader
              messageCount={messages.length}
              onClearHistory={handleClearHistory}
              onDeleteAllChats={userId ? handleDeleteAllChats : undefined}
              isLoading={isLoading}
            />

            <div className="flex-1 flex overflow-hidden relative">
              {/* Main chat area - takes remaining space */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Chat content will go here */}
                <div className="flex-1 overflow-hidden relative">
                  <ChatHistory messages={messages} />
                </div>

                <MessageInput
                  onSendMessage={handleSendMessage}
                  onGenerateImage={handleGenerateImage}
                  disabled={isLoading}
                  placeholder={isLoading ? "AI is thinking..." : "Ask me anything..."}
                  onOpenPanel={!showSidePanel ? handleOpenMobilePanel : undefined}
                />
              </div>

              {/* Right panel with tabs - hidden on mobile, visible on desktop */}
              {showSidePanel && (
                <div className="w-[20rem] xl:w-[23rem] 2xl:w-[25rem] border-l border-border/70 bg-card/50 backdrop-blur-sm panel-surface">
                  <SidePanelContent userId={userId} />
                </div>
              )}
            </div>
          </SidebarInset>
        </div>

        {!showSidePanel && (
          <Drawer open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
            <DrawerContent className="h-[min(90vh,820px)] p-0 bg-card/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <div className="flex h-full flex-col">
                <DrawerHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <DrawerTitle>Tools</DrawerTitle>
                    <DrawerClose asChild>
                      <Button ref={mobilePanelCloseRef} variant="ghost" size="icon" className="h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>

                <div className="flex-1 flex flex-col min-h-0">
                  <SidePanelContent
                    userId={userId}
                    value={mobilePanelTab}
                    onValueChange={(value) => setMobilePanelTab(value as 'knowledge' | 'image')}
                  />
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        )}

        <Toaster position="top-center" />
      </SidebarProvider>
    </ThemeWrapper>
  );
}
