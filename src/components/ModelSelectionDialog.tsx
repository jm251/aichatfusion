import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AIService } from '@/lib/ai-service';
import { APIBackendClient } from '@/lib/api-backend-client';
import type { AIService as AIServiceType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Github,
  Layers,
  Link2,
  MessageCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

type ChatStrategy = 'fast' | 'comprehensive' | 'consensus';
type SelectableService = Exclude<AIServiceType, 'system' | 'consensus'>;

interface ModelSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selection: { strategy: ChatStrategy; models: AIServiceType[] }) => void;
  initialSelection?: AIServiceType[];
  initialStrategy?: ChatStrategy;
}

const serviceInfo: Record<SelectableService, { name: string; icon: React.ReactNode; color: string; description: string }> = {
  groq: {
    name: 'Groq',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-orange-500',
    description: 'Fast responses',
  },
  gemini: {
    name: 'Gemini',
    icon: <Brain className="h-4 w-4" />,
    color: 'text-emerald-500',
    description: 'Strong reasoning',
  },
  openai: {
    name: 'OpenAI',
    icon: <Bot className="h-4 w-4" />,
    color: 'text-teal-500',
    description: 'Balanced GPT responses',
  },
  openrouter: {
    name: 'OpenRouter',
    icon: <Link2 className="h-4 w-4" />,
    color: 'text-purple-500',
    description: 'Many free model options',
  },
  github: {
    name: 'GitHub',
    icon: <Github className="h-4 w-4" />,
    color: 'text-indigo-500',
    description: 'Advanced model access',
  },
  cohere: {
    name: 'Cohere',
    icon: <MessageCircle className="h-4 w-4" />,
    color: 'text-sky-500',
    description: 'Natural conversation style',
  },
  xai: {
    name: 'xAI',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-red-500',
    description: 'Grok models',
  },
  fastrouter: {
    name: 'Anthropic',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-amber-600',
    description: 'Claude models',
  },
};

const strategyInfo: Record<ChatStrategy, { name: string; description: string; icon: React.ReactNode }> = {
  fast: {
    name: 'Quick',
    description: 'Single best response using fast fallback',
    icon: <Zap className="h-4 w-4 text-orange-500" />,
  },
  comprehensive: {
    name: 'Multi-AI',
    description: 'Get parallel responses from selected services',
    icon: <Layers className="h-4 w-4 text-blue-500" />,
  },
  consensus: {
    name: 'Consensus',
    description: 'Combine selected services into one final answer',
    icon: <Sparkles className="h-4 w-4 text-purple-500" />,
  },
};

const MAX_SELECTED_SERVICES = 4;
const DEFAULT_AUTO_SELECTION_COUNT = 3;
const MAX_MODELS_PER_PROVIDER = 4;
const OPENAI_MODELS_STORAGE_KEY = 'openai-selected-models';
const OPENAI_LEGACY_MODEL_STORAGE_KEY = 'openai-selected-model';
const FASTROUTER_MODELS_STORAGE_KEY = 'fastrouter-selected-models';
const services: SelectableService[] = ['groq', 'gemini', 'openai', 'openrouter', 'github', 'cohere', 'xai', 'fastrouter'];

function parseStoredModelArray(rawValue: string | null): string[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .filter((value: unknown) => typeof value === 'string')
          .map((value: string) => value.trim())
          .filter((value: string) => value.length > 0 && value !== '__auto__'),
      ),
    ).slice(0, MAX_MODELS_PER_PROVIDER);
  } catch {
    return [];
  }
}

function normalizeSelection(selection: AIServiceType[]): SelectableService[] {
  return selection
    .filter((service): service is SelectableService => services.includes(service as SelectableService))
    .slice(0, MAX_SELECTED_SERVICES);
}

function getStoredOpenAIModelSelection(): string[] {
  const storedOpenAIModels = parseStoredModelArray(localStorage.getItem(OPENAI_MODELS_STORAGE_KEY));
  if (storedOpenAIModels.length > 0) return storedOpenAIModels;

  const legacyModel = localStorage.getItem(OPENAI_LEGACY_MODEL_STORAGE_KEY);
  if (legacyModel && legacyModel !== '__auto__') {
    return [legacyModel];
  }

  return [];
}

function getStoredFastRouterModelSelection(): string[] {
  return parseStoredModelArray(localStorage.getItem(FASTROUTER_MODELS_STORAGE_KEY));
}

export function ModelSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  initialSelection = [],
  initialStrategy = 'comprehensive',
}: ModelSelectionDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [strategy, setStrategy] = useState<ChatStrategy>(initialStrategy);
  const [selectedModels, setSelectedModels] = useState<SelectableService[]>(normalizeSelection(initialSelection));
  const [availableServices, setAvailableServices] = useState<Record<string, boolean>>({});
  const [loadingServices, setLoadingServices] = useState(false);

  const [openaiModels, setOpenaiModels] = useState<string[]>([]);
  const [selectedOpenAIModels, setSelectedOpenAIModels] = useState<string[]>([]);
  const [loadingOpenAIModels, setLoadingOpenAIModels] = useState(false);

  const [fastRouterModels, setFastRouterModels] = useState<string[]>([]);
  const [selectedFastRouterModels, setSelectedFastRouterModels] = useState<string[]>([]);
  const [loadingFastRouterModels, setLoadingFastRouterModels] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStrategy(initialStrategy);
    setSelectedModels(normalizeSelection(initialSelection));
    setSelectedOpenAIModels(getStoredOpenAIModelSelection());
    setSelectedFastRouterModels(getStoredFastRouterModelSelection());
    setShowAdvanced(false);
    setLoadingOpenAIModels(false);
    setLoadingFastRouterModels(false);
  }, [open, initialSelection, initialStrategy]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const loadDialogData = async () => {
      setLoadingServices(true);

      try {
        const configuredServices = await AIService.getConfiguredServices();

        if (!isMounted) return;

        setAvailableServices(configuredServices);

        const hasInitialSelection = normalizeSelection(initialSelection).length > 0;
        const needsDefaultSelection =
          (initialStrategy === 'comprehensive' || initialStrategy === 'consensus') && !hasInitialSelection;
        if (needsDefaultSelection) {
          const autoSelection = services
            .filter((service) => configuredServices[service])
            .slice(0, DEFAULT_AUTO_SELECTION_COUNT);
          setSelectedModels(autoSelection);
        }

        // Prefetch advanced model lists without blocking the core setup UI.
        if (configuredServices.openai) {
          void APIBackendClient.getOpenAIModels();
        }
        if (configuredServices.fastrouter) {
          void APIBackendClient.getFastRouterModels();
        }
      } catch (error) {
        console.error('Failed to load AI setup services:', error);
        toast.error('Could not load configured AI services.');
      } finally {
        if (isMounted) {
          setLoadingServices(false);
        }
      }
    };

    loadDialogData();
    return () => {
      isMounted = false;
    };
  }, [open, initialSelection, initialStrategy]);

  useEffect(() => {
    if (!open || !showAdvanced) return;

    let isMounted = true;

    const loadAdvancedModelLists = async () => {
      const shouldLoadOpenAI = !!availableServices.openai;
      const shouldLoadFastRouter = !!availableServices.fastrouter;

      if (!shouldLoadOpenAI) setLoadingOpenAIModels(false);
      if (!shouldLoadFastRouter) setLoadingFastRouterModels(false);
      if (!shouldLoadOpenAI && !shouldLoadFastRouter) return;

      if (shouldLoadOpenAI) setLoadingOpenAIModels(true);
      if (shouldLoadFastRouter) setLoadingFastRouterModels(true);

      const tasks: Promise<void>[] = [];

      if (shouldLoadOpenAI) {
        tasks.push(
          APIBackendClient.getOpenAIModels()
            .then((openaiModelList) => {
              if (!isMounted) return;

              setOpenaiModels(openaiModelList);

              if (openaiModelList.length > 0) {
                setSelectedOpenAIModels((prev) => prev.filter((model) => openaiModelList.includes(model)));
              }
            })
            .catch((error) => {
              console.error('Failed to load OpenAI models:', error);
            })
            .finally(() => {
              if (isMounted) setLoadingOpenAIModels(false);
            }),
        );
      }

      if (shouldLoadFastRouter) {
        tasks.push(
          APIBackendClient.getFastRouterModels()
            .then((fastrouterModelList) => {
              if (!isMounted) return;

              setFastRouterModels(fastrouterModelList);

              if (fastrouterModelList.length > 0) {
                setSelectedFastRouterModels((prev) =>
                  prev.filter((model) => fastrouterModelList.includes(model)),
                );
              }
            })
            .catch((error) => {
              console.error('Failed to load Claude models:', error);
            })
            .finally(() => {
              if (isMounted) setLoadingFastRouterModels(false);
            }),
        );
      }

      await Promise.allSettled(tasks);
    };

    loadAdvancedModelLists();

    return () => {
      isMounted = false;
    };
  }, [open, showAdvanced, availableServices.openai, availableServices.fastrouter]);

  const availableServiceList = useMemo(
    () => services.filter((service) => availableServices[service]),
    [availableServices],
  );

  const selectedServiceSet = useMemo(() => {
    const serviceSet = new Set<AIServiceType>(selectedModels);
    if (selectedOpenAIModels.length > 0) serviceSet.add('openai');
    if (selectedFastRouterModels.length > 0) serviceSet.add('fastrouter');
    return serviceSet;
  }, [selectedModels, selectedOpenAIModels, selectedFastRouterModels]);

  const selectedCount = selectedServiceSet.size;
  const limitReached = selectedModels.length >= MAX_SELECTED_SERVICES;
  const openAIServiceAvailable = !!availableServices.openai;
  const fastRouterServiceAvailable = !!availableServices.fastrouter;

  const applyAutoSelection = (showToastMessage = true): SelectableService[] => {
    const autoSelection = availableServiceList.slice(0, DEFAULT_AUTO_SELECTION_COUNT);
    if (autoSelection.length === 0) {
      if (showToastMessage) {
        toast.error('No configured AI services found. Configure API keys first.');
      }
      return [];
    }
    setSelectedModels(autoSelection);
    if (showToastMessage) {
      toast.info(`Selected ${autoSelection.length} services automatically.`);
    }
    return autoSelection;
  };

  const handleStrategySelect = (nextStrategy: ChatStrategy) => {
    setStrategy(nextStrategy);

    if (nextStrategy === 'fast' || loadingServices || selectedModels.length > 0) {
      return;
    }

    const autoSelection = applyAutoSelection(false);
    if (autoSelection.length === 0) {
      toast.error('No configured AI services found. Configure API keys first.');
    } else {
      toast.info(`Selected ${autoSelection.length} services automatically.`);
    }
  };

  const ensureServiceSelected = (service: SelectableService): boolean => {
    if (selectedModels.includes(service)) return true;

    if (selectedModels.length >= MAX_SELECTED_SERVICES) {
      toast.error(`You can select up to ${MAX_SELECTED_SERVICES} services.`);
      return false;
    }

    setSelectedModels((prev) => [...prev, service]);
    return true;
  };

  const handleToggle = (service: SelectableService) => {
    setSelectedModels((prev) => {
      const isSelected = prev.includes(service);
      if (isSelected) {
        if (service === 'openai') setSelectedOpenAIModels([]);
        if (service === 'fastrouter') setSelectedFastRouterModels([]);
        return prev.filter((s) => s !== service);
      }

      if (prev.length >= MAX_SELECTED_SERVICES) {
        toast.error(`You can select up to ${MAX_SELECTED_SERVICES} services.`);
        return prev;
      }

      return [...prev, service];
    });
  };

  const handleClearAllServices = () => {
    setSelectedModels([]);
  };

  const handleOpenAIModelToggle = (modelId: string) => {
    if (modelId === '__auto__') {
      setSelectedOpenAIModels([]);
      return;
    }

    if (!ensureServiceSelected('openai')) return;

    setSelectedOpenAIModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((model) => model !== modelId);
      }

      if (prev.length >= MAX_MODELS_PER_PROVIDER) {
        toast.error(`You can select up to ${MAX_MODELS_PER_PROVIDER} OpenAI models.`);
        return prev;
      }

      return [...prev, modelId];
    });
  };

  const handleFastRouterModelToggle = (modelId: string) => {
    if (modelId === '__auto__') {
      setSelectedFastRouterModels([]);
      return;
    }

    if (!ensureServiceSelected('fastrouter')) return;

    setSelectedFastRouterModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((model) => model !== modelId);
      }

      if (prev.length >= MAX_MODELS_PER_PROVIDER) {
        toast.error(`You can select up to ${MAX_MODELS_PER_PROVIDER} Claude models.`);
        return prev;
      }

      return [...prev, modelId];
    });
  };

  const handleConfirm = () => {
    let finalSelection: AIServiceType[] = Array.from(selectedServiceSet).slice(0, MAX_SELECTED_SERVICES);

    if (strategy !== 'fast' && finalSelection.length === 0) {
      const autoSelection = availableServiceList.slice(0, DEFAULT_AUTO_SELECTION_COUNT);
      if (autoSelection.length === 0) {
        toast.error('No configured AI services found. Configure API keys first.');
        return;
      }
      finalSelection = autoSelection;
    }

    if (finalSelection.length > MAX_SELECTED_SERVICES) {
      toast.error(`You can select up to ${MAX_SELECTED_SERVICES} services.`);
      return;
    }

    localStorage.setItem(
      OPENAI_MODELS_STORAGE_KEY,
      JSON.stringify(selectedOpenAIModels.slice(0, MAX_MODELS_PER_PROVIDER)),
    );
    localStorage.setItem(
      OPENAI_LEGACY_MODEL_STORAGE_KEY,
      selectedOpenAIModels[0] || '__auto__',
    );
    localStorage.setItem(
      FASTROUTER_MODELS_STORAGE_KEY,
      JSON.stringify(selectedFastRouterModels.slice(0, MAX_MODELS_PER_PROVIDER)),
    );

    onConfirm({ strategy, models: finalSelection });
    onOpenChange(false);
  };

  const canConfirm =
    strategy === 'fast' || selectedCount > 0 || availableServiceList.length > 0;

  const openAIStatusLabel =
    selectedOpenAIModels.length === 0
      ? 'Auto'
      : `${selectedOpenAIModels.length} model${selectedOpenAIModels.length > 1 ? 's' : ''} selected`;
  const fastRouterStatusLabel =
    selectedFastRouterModels.length === 0
      ? 'Auto'
      : `${selectedFastRouterModels.length} model${selectedFastRouterModels.length > 1 ? 's' : ''} selected`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className="w-[calc(100vw-1rem)] sm:max-w-[760px] max-h-[92vh] flex flex-col border border-border/70 bg-card/95 text-foreground backdrop-blur-sm p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 pb-3 px-4 sm:px-5 pt-4 sm:pt-5 surface-enter">
          <DialogTitle className="section-title text-xl">AI Setup</DialogTitle>
          <DialogDescription className="section-subtitle">
            Pick your chat mode and, if needed, choose services. Functionality stays the same, only setup is simpler.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-5 py-3">
          <section className="space-y-2 rounded-xl border border-border/70 bg-background/65 p-3 surface-enter surface-enter-delay-1">
            <Label className="text-sm font-semibold section-title">Mode</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(strategyInfo) as ChatStrategy[]).map((mode) => {
                const info = strategyInfo[mode];
                const selected = strategy === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleStrategySelect(mode)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                        : 'bg-card/70 hover:bg-muted',
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {info.icon}
                      <span>{info.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{info.description}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {strategy !== 'fast' && (
            <section className="space-y-3 rounded-xl border border-border/70 bg-background/65 p-3 surface-enter surface-enter-delay-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-semibold section-title">AI services</Label>
                <Badge variant="secondary" className="text-xs border border-border/70 bg-card/70">
                  {selectedCount} selected (max {MAX_SELECTED_SERVICES})
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyAutoSelection(true)}
                  disabled={loadingServices || availableServiceList.length === 0}
                >
                  Auto-select ({Math.min(DEFAULT_AUTO_SELECTION_COUNT, availableServiceList.length)})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllServices}
                  disabled={selectedModels.length === 0}
                >
                  Clear
                </Button>
              </div>

              {loadingServices ? (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  Loading configured services...
                </div>
              ) : availableServiceList.length === 0 ? (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  No AI services are configured yet. Add keys in Settings to enable Multi-AI and Consensus modes.
                </div>
              ) : (
                <div className="grid gap-2 lg:grid-cols-2">
                  {availableServiceList.map((service) => {
                    const info = serviceInfo[service];
                    const isSelected = selectedModels.includes(service);
                    const isBlockedByLimit = !isSelected && limitReached;
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => !isBlockedByLimit && handleToggle(service)}
                        className={cn(
                          'relative flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                            : 'bg-card/70 hover:bg-muted',
                          isBlockedByLimit && 'opacity-70 cursor-not-allowed',
                        )}
                      >
                        {isSelected && (
                          <span className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-primary" />
                        )}
                        <Checkbox
                          id={`service-${service}`}
                          checked={isSelected}
                          className="pointer-events-none h-4 w-4"
                        />
                        <Label
                          htmlFor={`service-${service}`}
                          className="flex-1 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={cn(info.color, 'inline-flex items-center')}>{info.icon}</span>
                            <span className="font-medium text-sm">{info.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{info.description}</div>
                        </Label>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className="space-y-2 rounded-xl border border-border/70 bg-background/65 p-3 surface-enter surface-enter-delay-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full flex items-center justify-between rounded-lg border border-border/70 bg-card/70 hover:bg-muted px-3 py-2 text-sm"
            >
              <span className="font-medium">Advanced model preferences</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-lg border border-border/70 bg-card/70 p-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <Label className="text-xs font-medium">OpenAI models</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {loadingOpenAIModels ? 'Loading...' : openAIStatusLabel}
                    </Badge>
                  </div>

                  {!openAIServiceAvailable ? (
                    <div className="rounded-lg border p-2 text-xs text-muted-foreground">
                      Configure OpenAI keys to select specific OpenAI models.
                    </div>
                  ) : loadingOpenAIModels ? (
                    <div className="rounded-lg border p-2 text-xs text-muted-foreground">
                      Loading OpenAI models...
                    </div>
                  ) : (
                    <div className="grid gap-2 max-h-44 overflow-y-auto pr-1">
                      {(['__auto__', ...openaiModels] as string[]).map((modelId) => {
                        const isAuto = modelId === '__auto__';
                        const isSelectedModel = isAuto
                          ? selectedOpenAIModels.length === 0
                          : selectedOpenAIModels.includes(modelId);
                        const modelLabel = isAuto ? 'Auto' : modelId;
                        const limitReachedForModel = selectedOpenAIModels.length >= MAX_MODELS_PER_PROVIDER;
                        const disabled = !isAuto && !isSelectedModel && limitReachedForModel;

                        return (
                          <button
                            key={modelId}
                            type="button"
                            onClick={() => !disabled && handleOpenAIModelToggle(modelId)}
                            className={cn(
                              'w-full text-left rounded-lg border p-2 text-xs transition-colors',
                              disabled && 'opacity-60 cursor-not-allowed',
                              isSelectedModel
                                ? 'bg-primary/10 border-primary ring-1 ring-primary/40'
                                : 'bg-background/70 hover:bg-muted',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{modelLabel}</span>
                              {isSelectedModel && (
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {openaiModels.length === 0 && (
                        <div className="rounded-lg border p-2 text-xs text-muted-foreground">
                          No OpenAI models available.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <Label className="text-xs font-medium">Claude models (FastRouter)</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {loadingFastRouterModels ? 'Loading...' : fastRouterStatusLabel}
                    </Badge>
                  </div>

                  {!fastRouterServiceAvailable ? (
                    <div className="rounded-lg border p-2 text-xs text-muted-foreground">
                      Configure FastRouter keys to select specific Claude models.
                    </div>
                  ) : loadingFastRouterModels ? (
                    <div className="rounded-lg border p-2 text-xs text-muted-foreground">
                      Loading Claude models...
                    </div>
                  ) : (
                    <div className="grid gap-2 max-h-44 overflow-y-auto pr-1">
                      {(['__auto__', ...fastRouterModels] as string[]).map((modelId) => {
                        const isAuto = modelId === '__auto__';
                        const isSelectedModel = isAuto
                          ? selectedFastRouterModels.length === 0
                          : selectedFastRouterModels.includes(modelId);
                        const modelLabel = isAuto ? 'Auto' : modelId;
                        const limitReachedForModel = selectedFastRouterModels.length >= MAX_MODELS_PER_PROVIDER;
                        const disabled = !isAuto && !isSelectedModel && limitReachedForModel;

                        return (
                          <button
                            key={modelId}
                            type="button"
                            onClick={() => !disabled && handleFastRouterModelToggle(modelId)}
                            className={cn(
                              'w-full text-left rounded-lg border p-2 text-xs transition-colors',
                              disabled && 'opacity-60 cursor-not-allowed',
                              isSelectedModel
                                ? 'bg-primary/10 border-primary ring-1 ring-primary/40'
                                : 'bg-background/70 hover:bg-muted',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{modelLabel}</span>
                              {isSelectedModel && (
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {fastRouterModels.length === 0 && (
                        <div className="rounded-lg border p-2 text-xs text-muted-foreground">
                          No Claude models available.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="shrink-0 mt-1 border-t border-border/60 px-4 sm:px-5 py-3 grid grid-cols-2 sm:flex sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="text-sm w-full sm:w-auto">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
