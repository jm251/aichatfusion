import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  Lightbulb,
} from "lucide-react";
import { APIConfigManager } from "@/lib/api-config";
import { toast } from "sonner";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [groqKeys, setGroqKeys] = useState<string[]>([""]);
  const [geminiKeys, setGeminiKeys] = useState<string[]>([""]);
  const [openaiKeys, setOpenaiKeys] = useState<string[]>([""]);
  const [openrouterKeys, setOpenrouterKeys] = useState<string[]>([""]);
  const [githubKeys, setGithubKeys] = useState<string[]>([""]);
  const [cohereKeys, setCohereKeys] = useState<string[]>([""]);
  const [xaiKeys, setXaiKeys] = useState<string[]>([""]);
  const [showKeys, setShowKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCurrentKeys();
    }
  }, [open]);

  const loadCurrentKeys = async () => {
    try {
      await APIConfigManager.initialize();
      
      // Use async method to get key counts from backend if needed
      const groqCount = APIConfigManager.getKeyCount("groq");
      const geminiCount = APIConfigManager.getKeyCount("gemini");
      const openaiCount = APIConfigManager.getKeyCount("openai");
      const openrouterCount = APIConfigManager.getKeyCount("openrouter");
      const githubCount = APIConfigManager.getKeyCount("github");
      const cohereCount = APIConfigManager.getKeyCount("cohere");
      const xaiCount = APIConfigManager.getKeyCount("xai");

      setGroqKeys(
        groqCount > 0
          ? [`${groqCount} key${groqCount > 1 ? "s" : ""} configured`]
          : [""]
      );
      setGeminiKeys(
        geminiCount > 0
          ? [`${geminiCount} key${geminiCount > 1 ? "s" : ""} configured`]
          : [""]
      );
      setOpenaiKeys(
        openaiCount > 0
          ? [`${openaiCount} key${openaiCount > 1 ? "s" : ""} configured`]
          : [""]
      );
      setOpenrouterKeys(
        openrouterCount > 0
          ? [
              `${openrouterCount} key${
                openrouterCount > 1 ? "s" : ""
              } configured`,
            ]
          : [""]
      );
      setGithubKeys(
        githubCount > 0
          ? [`${githubCount} key${githubCount > 1 ? "s" : ""} configured`]
          : [""]
      );
      setCohereKeys(
        cohereCount > 0
          ? [`${cohereCount} key${cohereCount > 1 ? "s" : ""} configured`]
          : [""]
      );
      setXaiKeys(
        xaiCount > 0
          ? [`${xaiCount} key${xaiCount > 1 ? "s" : ""} configured`]
          : [""]
      );
    } catch (error) {
      console.error("Failed to load API key status:", error);
    }
  };

  const addKeyField = (
    service: "groq" | "gemini" | "openai" | "openrouter" | "github"| "cohere" | "xai"
  ) => {
    switch (service) {
      case "groq":
        setGroqKeys([...groqKeys, ""]);
        break;
      case "gemini":
        setGeminiKeys([...geminiKeys, ""]);
        break;
      case "openai":
        setOpenaiKeys([...openaiKeys, ""]);
        break;
      case "openrouter":
        setOpenrouterKeys([...openrouterKeys, ""]);
        break;
      case "github":
        setGithubKeys([...githubKeys, ""]);
        break;
      case "cohere":
        setCohereKeys([...cohereKeys, ""]);
        break;
      case "xai":
        setXaiKeys([...xaiKeys, ""]);
        break;
    }
  };

  const removeKeyField = (
    service: "groq" | "gemini" | "openai" | "openrouter" | "github"| "cohere" | "xai",
    index: number
  ) => {
    switch (service) {
      case "groq":
        const newGroqKeys = groqKeys.filter((_, i) => i !== index);
        setGroqKeys(newGroqKeys.length > 0 ? newGroqKeys : [""]);
        break;
      case "gemini":
        const newGKeys = geminiKeys.filter((_, i) => i !== index);
        setGeminiKeys(newGKeys.length > 0 ? newGKeys : [""]);
        break;
      case "openai":
        const newOAIKeys = openaiKeys.filter((_, i) => i !== index);
        setOpenaiKeys(newOAIKeys.length > 0 ? newOAIKeys : [""]);
        break;
      case "openrouter":
        const newOKeys = openrouterKeys.filter((_, i) => i !== index);
        setOpenrouterKeys(newOKeys.length > 0 ? newOKeys : [""]);
        break;
      case "github":
        const newGHKeys = githubKeys.filter((_, i) => i !== index);
        setGithubKeys(newGHKeys.length > 0 ? newGHKeys : [""]);
        break;
      case "cohere":
        const newCohereKeys = cohereKeys.filter((_, i) => i !== index);
        setCohereKeys(newCohereKeys.length > 0 ? newCohereKeys : [""]);
        break;
      case "xai":
        const newXaiKeys = xaiKeys.filter((_, i) => i !== index);
        setXaiKeys(newXaiKeys.length > 0 ? newXaiKeys : [""]);
        break;
    }
  };

  const updateKey = (
    service: "groq" | "gemini" | "openai" | "openrouter" | "github" | "cohere" | "xai",
    index: number,
    value: string
  ) => {
    switch (service) {
      case "groq":
        const newGroqKeys = [...groqKeys];
        newGroqKeys[index] = value;
        setGroqKeys(newGroqKeys);
        break;
      case "gemini":
        const newGKeys = [...geminiKeys];
        newGKeys[index] = value;
        setGeminiKeys(newGKeys);
        break;
      case "openai":
        const newOAIKeys = [...openaiKeys];
        newOAIKeys[index] = value;
        setOpenaiKeys(newOAIKeys);
        break;
      case "openrouter":
        const newORKeys = [...openrouterKeys];
        newORKeys[index] = value;
        setOpenrouterKeys(newORKeys);
        break;
      case "github":
        const newGHKeys = [...githubKeys];
        newGHKeys[index] = value;
        setGithubKeys(newGHKeys);
        break;
      case "cohere":
        const newCohereKeys = [...cohereKeys];
        newCohereKeys[index] = value;
        setCohereKeys(newCohereKeys);
        break;
      case "xai":
        const newXaiKeys = [...xaiKeys];
        newXaiKeys[index] = value;
        setXaiKeys(newXaiKeys);
        break;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Show instructions for configuring API keys with emphasis on multiple keys
      toast.info(
        "To configure API keys: 1) Copy .env.example to .env.local, 2) Add your API keys (use KEY1, KEY2, etc. for multiple), 3) Restart the app",
        { duration: 10000 }
      );

      // Log current configuration status
      await APIConfigManager.initialize();
      // console.log('Current API Configuration:');
      // console.log('- Groq keys:', APIConfigManager.getKeyCount('groq'));
      // console.log('- Gemini keys:', APIConfigManager.getKeyCount('gemini'));

      setOpen(false);
    } catch (error) {
      toast.error("Configuration error");
      console.error("Configuration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderKeyInputs = (
    title: string,
    description: string,
    keys: string[],
    service: "groq" | "gemini" | "openai" | "openrouter" | "github"| "cohere" | "xai",
    placeholder: string,
    color: string
  ) => (
    <Card className="overflow-hidden border-border/70 bg-card/70 shadow-none surface-enter surface-enter-delay-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="flex items-center gap-2 text-base sm:text-lg section-title">
            {title}
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${color}`} />
          </span>
          <Badge variant="outline" className="w-fit">
            {keys.filter((k) => k.trim()).length} keys
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        {keys.map((key, index) => (
          <div key={index} className="flex gap-2 items-center">
            <div className="flex-1 min-w-0">
              <Input
                type={showKeys ? "text" : "password"}
                placeholder={placeholder}
                value={key}
                onChange={(e) => updateKey(service, index, e.target.value)}
                className="font-mono text-xs sm:text-sm border-border/70 bg-background/80"
              />
            </div>
            {keys.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeKeyField(service, index)}
                className="px-2 flex-shrink-0 border-border/70"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addKeyField(service)}
          className="w-full mt-2 border-border/70 bg-background/70 hover:bg-muted"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Add Another Key
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 border border-transparent hover:border-border/70 hover:bg-card/70">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        ref={contentRef}
        className="w-[calc(100vw-1rem)] sm:max-w-6xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col p-0 border border-border/70 bg-card/95 backdrop-blur-sm"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-border/60 surface-enter">
          <DialogTitle className="text-lg sm:text-xl section-title">Multi-AI Configuration</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm section-subtitle">
            Configure API keys for Groq, Gemini, OpenAI, OpenRouter, GitHub, Cohere, and xAI services.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 surface-enter surface-enter-delay-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="gap-1 sm:gap-2 w-full sm:w-fit"
              >
                {showKeys ? (
                  <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                {showKeys ? "Hide" : "Show"} Keys
              </Button>

              <Card className="p-2 sm:p-3 border border-border/70 bg-background/70 shadow-none w-full sm:w-auto">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground min-w-0">
                    <div className="font-medium">Smart Strategy:</div>
                    <div className="break-words">Groq -&gt; Gemini -&gt; OpenAI -&gt; Cohere -&gt; xAI -&gt; GitHub -&gt; OpenRouter</div>
                  </div>
                </div>
              </Card>
            </div>

            <Tabs defaultValue="groq" className="w-full surface-enter surface-enter-delay-2">
              <TabsList className="w-full h-auto p-1 border border-border/70 bg-card/70 rounded-xl grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1">
                <TabsTrigger value="groq" className="text-[11px] sm:text-xs px-2 py-1.5">
                  Groq
                </TabsTrigger>
                <TabsTrigger value="gemini" className="text-[11px] sm:text-xs px-2 py-1.5">
                  Gemini
                </TabsTrigger>
                <TabsTrigger value="openai" className="text-[11px] sm:text-xs px-2 py-1.5">
                  OpenAI
                </TabsTrigger>
                <TabsTrigger value="openrouter" className="text-[11px] sm:text-xs px-2 py-1.5">
                  OpenRouter
                </TabsTrigger>
                <TabsTrigger value="github" className="text-[11px] sm:text-xs px-2 py-1.5">
                  GitHub
                </TabsTrigger>
                <TabsTrigger value="cohere" className="text-[11px] sm:text-xs px-2 py-1.5">
                  Cohere
                </TabsTrigger>
                <TabsTrigger value="xai" className="text-[11px] sm:text-xs px-2 py-1.5">
                  xAI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="groq" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {renderKeyInputs(
                  "Groq Speed and Real-Time",
                  "Ultra-fast responses for interactive chatbots (tries first for speed)",
                  groqKeys,
                  "groq",
                  "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                  "bg-orange-500"
                )}
                <Card className="bg-background/70 border-border/70 overflow-hidden shadow-none">
                  <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground">
                    <div className="font-medium mb-1">Perfect for:</div>
                    <div className="text-[11px] sm:text-xs">
                      Real-time conversations, quick responses, interactive elements.
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 opacity-80">
                      Get your key:{" "}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                      >
                        console.groq.com/keys
                      </a>
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1 opacity-70">
                      Model: llama-3.1-8b-instant
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gemini" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {renderKeyInputs(
                  "Gemini Complex Reasoning",
                  "Advanced reasoning for creative writing and complex instructions",
                  geminiKeys,
                  "gemini",
                  "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                  "bg-emerald-500"
                )}
                <Card className="bg-background/70 border-border/70 overflow-hidden shadow-none">
                  <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground">
                    <div className="font-medium mb-1">Perfect for:</div>
                    <div className="text-[11px] sm:text-xs">
                      Creative writing, complex analysis, multi-step reasoning, educational content.
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 opacity-80">
                      Get your key:{" "}
                      <a
                        href="https://makersuite.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                      >
                        makersuite.google.com/app/apikey
                      </a>
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1 opacity-70">
                      Model: gemini-1.5-pro-latest
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="openai" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {renderKeyInputs(
                  "OpenAI GPT-4o-mini",
                  "Fast and reliable responses with GPT-4o-mini (free tier available)",
                  openaiKeys,
                  "openai",
                  "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                  "bg-teal-500"
                )}
                <Card className="bg-background/70 border-border/70 overflow-hidden shadow-none">
                  <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground">
                    <div className="font-medium mb-1">Perfect for:</div>
                    <div className="text-[11px] sm:text-xs">
                      Fast responses, general knowledge, code generation, creative writing.
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 opacity-80">
                      Get your key:{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                      >
                        platform.openai.com/api-keys
                      </a>
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1 opacity-70">
                      Model: gpt-4o-mini (free tier available)
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="openrouter" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {renderKeyInputs(
                  "OpenRouter Multi-Model Access",
                  "Access to multiple powerful AI models through a single API",
                  openrouterKeys,
                  "openrouter",
                  "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                  "bg-purple-500"
                )}
                <Card className="bg-background/70 border-border/70 overflow-hidden shadow-none">
                  <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground">
                    <div className="font-medium mb-1">Perfect for:</div>
                    <div className="text-[11px] sm:text-xs">
                      Access to multiple models, advanced capabilities, fallback reliability.
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 opacity-80">
                      Get your key:{" "}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                      >
                        openrouter.ai/keys
                      </a>
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1 opacity-70">
                      Models: meta-llama/llama-3.3-70b-instruct:free and other free models
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="github" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {renderKeyInputs(
                  "GitHub Models Advanced AI Models",
                  "Access to DeepSeek, Grok, Llama, Mistral, Microsoft, and OpenAI models",
                  githubKeys,
                  "github",
                  "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxx",
                  "bg-indigo-500"
                )}
                <Card className="bg-background/70 border-border/70 overflow-hidden shadow-none">
                  <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground">
                    <div className="font-medium mb-1">Perfect for:</div>
                    <div className="text-[11px] sm:text-xs">
                      Advanced reasoning with DeepSeek R1, creative generation with Grok, code generation with Mistral Codestral, research with Microsoft MAI-DS.
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 opacity-80">
                      Get your token:{" "}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                      >
                        github.com/settings/tokens
                      </a>
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1 opacity-70">
                      Models: DeepSeek (R1, V3), Grok (3, 3-mini), Llama 4 Scout, Mistral Codestral, Microsoft MAI-DS-R1, GPT-4.1
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="cohere" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {renderKeyInputs(
                  "Cohere Language Understanding",
                  "Powerful language models for understanding and generating text",
                  cohereKeys,
                  "cohere",
                  "cohere-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                  "bg-teal-500"
                )}
                <Card className="bg-background/70 border-border/70 overflow-hidden shadow-none">
                  <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground">
                    <div className="font-medium mb-1">Perfect for:</div>
                    <div className="text-[11px] sm:text-xs">
                      Natural language understanding, text generation, summarization, classification.
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 opacity-80">
                      Get your key:{" "}
                      <a
                        href="https://cohere.com/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                      >
                        cohere.com/api
                      </a>
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1 opacity-70">
                      Models: command-a-03-2025 (primary), command-r-plus-08-2024, command-r7b-12-2024
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="xai" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {renderKeyInputs(
                  "xAI Grok AI Models",
                  "Direct access to Grok models with wit and advanced reasoning",
                  xaiKeys,
                  "xai",
                  "xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                  "bg-red-500"
                )}
                <Card className="bg-background/70 border-border/70 overflow-hidden shadow-none">
                  <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground">
                    <div className="font-medium mb-1">Perfect for:</div>
                    <div className="text-[11px] sm:text-xs">
                      Witty and engaging responses, advanced reasoning, creative problem solving, real-time information.
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 opacity-80">
                      Get your key:{" "}
                      <a
                        href="https://console.x.ai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                      >
                        console.x.ai
                      </a>
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1 opacity-70">
                      Model: grok-4-0709
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

              <Card className="overflow-hidden border-border/70 bg-background/70 shadow-none surface-enter surface-enter-delay-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg section-title">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="font-medium text-foreground mb-1 text-sm">
                      Sequential Strategy (Fast)
                    </div>
                    <div className="text-[11px] sm:text-xs">
                      Groq -&gt; Gemini -&gt; OpenAI -&gt; Cohere -&gt; xAI -&gt; GitHub -&gt; OpenRouter
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-80 mt-1">
                      Fastest provider starts first; others are fallbacks on failure.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground mb-1 text-sm">
                      Parallel Strategy (Comprehensive)
                    </div>
                    <div className="text-[11px] sm:text-xs">
                      All services respond simultaneously
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-80 mt-1">
                      AI judges best response for quality
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="font-medium text-foreground mb-1 text-sm">
                    Key Management:
                  </div>
                  <div className="text-[11px] sm:text-xs">
                    Automatic rotation when rate limits hit. Multiple keys per service. Configure at least one service to get started.
                  </div>
                  <div className="mt-2 p-2 bg-card border border-border/70 rounded">
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      <strong>Setup Instructions:</strong> Copy{" "}
                      <code className="px-1 py-0.5 bg-muted rounded">.env.example</code> to{" "}
                      <code className="px-1 py-0.5 bg-muted rounded">.env.local</code> and add
                      your API keys, then restart the app.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/60 bg-card/70">
          <Button variant="outline" onClick={() => setOpen(false)} size="sm" className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="gap-1 sm:gap-2 w-full sm:w-auto" size="sm">
            <Save className="w-3 h-3 sm:w-4 sm:h-4" />
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
