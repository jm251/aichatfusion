import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap,
  Brain,
  Link2,
  Rocket,
  MessageSquare,
  Shield,
  Key,
  RotateCw,
  History,
  Code,
  Copy,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Bot,
} from 'lucide-react';

const quickStartSteps = [
  {
    title: 'Configure API keys',
    detail: 'Open Settings and add at least one provider key. Multiple keys per provider are supported.',
  },
  {
    title: 'Choose AI mode',
    detail: 'Use AI Setup to switch between Quick, Multi-AI, and Consensus.',
  },
  {
    title: 'Start chatting',
    detail: 'Send your prompt and review responses with source labels and timing details.',
  },
];

const providers = [
  { name: 'Groq', detail: 'Ultra-fast responses', icon: Zap, tone: 'text-orange-500' },
  { name: 'Gemini', detail: 'Strong reasoning and synthesis', icon: Brain, tone: 'text-emerald-500' },
  { name: 'OpenAI', detail: 'Balanced GPT responses', icon: Bot, tone: 'text-teal-500' },
  { name: 'OpenRouter', detail: 'Free model variety', icon: Link2, tone: 'text-purple-500' },
  { name: 'GitHub Models', detail: 'Advanced model catalog', icon: Rocket, tone: 'text-indigo-500' },
  { name: 'Cohere', detail: 'Natural conversational style', icon: MessageSquare, tone: 'text-sky-500' },
];

const keyFeatures = [
  { name: 'Smart fallback', detail: 'Automatic provider failover', icon: Shield, tone: 'text-green-500' },
  { name: 'Key rotation', detail: 'Multiple keys per service', icon: RotateCw, tone: 'text-orange-500' },
  { name: 'Chat history', detail: 'Automatic persistence', icon: History, tone: 'text-blue-500' },
  { name: 'Code rendering', detail: 'Syntax highlight for many languages', icon: Code, tone: 'text-purple-500' },
  { name: 'One-click copy', detail: 'Copy responses and code quickly', icon: Copy, tone: 'text-indigo-500' },
];

export function UserGuide() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1.5 sm:px-4 md:px-6 sm:space-y-8 surface-enter">
      <section className="text-center space-y-3 surface-enter">
        <h2 className="px-2 text-2xl font-bold sm:text-3xl header-title-gradient font-display section-title">
          AI Chat Fusion Guide
        </h2>
        <p className="mx-auto max-w-3xl px-2 text-sm sm:text-base section-subtitle">
          Learn how to configure providers, choose the right mode, and get better responses with less effort.
        </p>
      </section>

      <Card className="border-primary/20 bg-card/75 surface-enter surface-enter-delay-1">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl section-title">
            <Sparkles className="h-5 w-5 text-primary" />
            Why this workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Multi-model reliability
            </h4>
            <p className="pl-6 text-xs text-muted-foreground sm:text-sm">
              You are not tied to one model. The app can route or combine across multiple providers.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Better uptime
            </h4>
            <p className="pl-6 text-xs text-muted-foreground sm:text-sm">
              If one service fails or rate-limits, fallback routing keeps answers flowing.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Free-tier friendly
            </h4>
            <p className="pl-6 text-xs text-muted-foreground sm:text-sm">
              Combine free tiers and rotate keys to maximize availability.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Built for coding
            </h4>
            <p className="pl-6 text-xs text-muted-foreground sm:text-sm">
              Clean markdown, syntax highlighting, and copy actions are optimized for technical workflows.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="start" className="w-full space-y-4 surface-enter surface-enter-delay-2">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/70 bg-card/70 p-1">
          <TabsTrigger value="start" className="text-[10px] xs:text-[11px] sm:text-sm px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Getting Started
          </TabsTrigger>
          <TabsTrigger value="features" className="text-[10px] xs:text-[11px] sm:text-sm px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Features
          </TabsTrigger>
          <TabsTrigger value="keys" className="text-[10px] xs:text-[11px] sm:text-sm px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            API Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="start" className="mt-0 space-y-4">
          <Card className="border-border/70 bg-card/75">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg section-title">Quick start</CardTitle>
              <CardDescription className="text-xs sm:text-sm section-subtitle">
                Follow these three steps to start with minimal friction.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickStartSteps.map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium sm:text-base">{step.title}</h4>
                    <p className="text-xs text-muted-foreground sm:text-sm">{step.detail}</p>
                  </div>
                </div>
              ))}

              <Alert className="border-border/70 bg-background/70">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  For best reliability, add multiple keys per provider so automatic rotation can recover from rate limits.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/70 bg-card/75">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base section-title">Providers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {providers.map((provider) => {
                  const Icon = provider.icon;
                  return (
                    <div key={provider.name} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/70 p-2.5">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${provider.tone}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium sm:text-sm">{provider.name}</div>
                        <div className="text-[11px] text-muted-foreground sm:text-xs">{provider.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/75">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base section-title">Core features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {keyFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.name} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/70 p-2.5">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${feature.tone}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium sm:text-sm">{feature.name}</div>
                        <div className="text-[11px] text-muted-foreground sm:text-xs">{feature.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keys" className="mt-0 space-y-4">
          <Card className="border-border/70 bg-card/75">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg section-title">API key setup</CardTitle>
              <CardDescription className="text-xs sm:text-sm section-subtitle">
                Add provider keys in your local environment file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-border/70 bg-background/70">
                <Key className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  Create a <code className="rounded bg-muted px-1 py-0.5">.env.local</code> file and define provider keys.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                {[
                  ['VITE_GROQ_API_KEY', 'https://console.groq.com/keys'],
                  ['VITE_GOOGLE_API_KEY', 'https://makersuite.google.com/app/apikey'],
                  ['VITE_OPENAI_API_KEY', 'https://platform.openai.com/api-keys'],
                  ['VITE_OPENROUTER_API_KEY', 'https://openrouter.ai/keys'],
                  ['VITE_GITHUB_TOKEN', 'https://github.com/settings/tokens'],
                  ['VITE_COHERE_API_KEY', 'https://dashboard.cohere.com/api-keys'],
                ].map(([key, url]) => (
                  <div key={key} className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background/70 p-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mono text-[10px] sm:text-xs">{key}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-primary hover:underline sm:text-xs"
                    >
                      Get key
                    </a>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <h4 className="mb-2 text-xs font-medium sm:text-sm">Multiple key rotation</h4>
                <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px] sm:text-xs">
{`VITE_GOOGLE_API_KEY1=first_key
VITE_GOOGLE_API_KEY2=second_key
VITE_GROQ_API_KEY1=first_key
VITE_GROQ_API_KEY2=second_key`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
