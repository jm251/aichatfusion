import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Eye, EyeSlash, Plus, Trash, Save, Lightbulb } from '@phosphor-icons/react';
import { APIConfigManager } from '@/lib/api-config';
import { toast } from 'sonner';

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [groqKeys, setGroqKeys] = useState<string[]>(['']);
  const [perplexityKeys, setPerplexityKeys] = useState<string[]>(['']);
  const [geminiKeys, setGeminiKeys] = useState<string[]>(['']);
  const [openrouterKeys, setOpenrouterKeys] = useState<string[]>(['']);
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
      const serviceStatus = await APIConfigManager.getServiceStatus();
      
      // Since we can't retrieve actual keys, we'll show placeholders for configured services
      setGroqKeys(serviceStatus.groq ? ['Configured'] : ['']);
      setPerplexityKeys(serviceStatus.perplexity ? ['Configured'] : ['']);
      setGeminiKeys(serviceStatus.gemini ? ['Configured'] : ['']);
      setOpenrouterKeys(serviceStatus.openrouter ? ['Configured'] : ['']);
    } catch (error) {
      console.error('Failed to load API key status:', error);
    }
  };

  const addKeyField = (service: 'groq' | 'perplexity' | 'gemini' | 'openrouter') => {
    switch (service) {
      case 'groq':
        setGroqKeys([...groqKeys, '']);
        break;
      case 'perplexity':
        setPerplexityKeys([...perplexityKeys, '']);
        break;
      case 'gemini':
        setGeminiKeys([...geminiKeys, '']);
        break;
      case 'openrouter':
        setOpenrouterKeys([...openrouterKeys, '']);
        break;
    }
  };

  const removeKeyField = (service: 'groq' | 'perplexity' | 'gemini' | 'openrouter', index: number) => {
    switch (service) {
      case 'groq':
        const newGroqKeys = groqKeys.filter((_, i) => i !== index);
        setGroqKeys(newGroqKeys.length > 0 ? newGroqKeys : ['']);
        break;
      case 'perplexity':
        const newPKeys = perplexityKeys.filter((_, i) => i !== index);
        setPerplexityKeys(newPKeys.length > 0 ? newPKeys : ['']);
        break;
      case 'gemini':
        const newGKeys = geminiKeys.filter((_, i) => i !== index);
        setGeminiKeys(newGKeys.length > 0 ? newGKeys : ['']);
        break;
      case 'openrouter':
        const newORKeys = openrouterKeys.filter((_, i) => i !== index);
        setOpenrouterKeys(newORKeys.length > 0 ? newORKeys : ['']);
        break;
    }
  };

  const updateKey = (service: 'groq' | 'perplexity' | 'gemini' | 'openrouter', index: number, value: string) => {
    switch (service) {
      case 'groq':
        const newGroqKeys = [...groqKeys];
        newGroqKeys[index] = value;
        setGroqKeys(newGroqKeys);
        break;
      case 'perplexity':
        const newPKeys = [...perplexityKeys];
        newPKeys[index] = value;
        setPerplexityKeys(newPKeys);
        break;
      case 'gemini':
        const newGKeys = [...geminiKeys];
        newGKeys[index] = value;
        setGeminiKeys(newGKeys);
        break;
      case 'openrouter':
        const newORKeys = [...openrouterKeys];
        newORKeys[index] = value;
        setOpenrouterKeys(newORKeys);
        break;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Since this is a client-side app, API keys should be configured through environment variables
      // This dialog is informational only
      toast.info('API keys must be configured through environment variables');
      setOpen(false);
    } catch (error) {
      toast.error('Configuration error');
      console.error('Configuration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderKeyInputs = (
    title: string,
    description: string,
    keys: string[],
    service: 'groq' | 'perplexity' | 'gemini' | 'openrouter',
    placeholder: string,
    color: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {title}
            <div className={`w-3 h-3 rounded-full ${color}`} />
          </span>
          <Badge variant="outline">
            {keys.filter(k => k.trim()).length} keys
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {keys.map((key, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <Input
                type={showKeys ? 'text' : 'password'}
                placeholder={placeholder}
                value={key}
                onChange={(e) => updateKey(service, index, e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            {keys.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeKeyField(service, index)}
                className="px-2"
              >
                <Trash className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addKeyField(service)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Key
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Multi-AI Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="gap-2"
              >
                {showKeys ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showKeys ? 'Hide' : 'Show'} Keys
              </Button>
            </div>
            
            <Card className="p-3 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" weight="fill" />
                <div className="text-xs text-blue-700">
                  <div className="font-medium">Smart Strategy:</div>
                  <div>Groq → Gemini → OpenRouter → Spark (fallback)</div>
                </div>
              </div>
            </Card>
          </div>

          <Tabs defaultValue="groq" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="groq" className="text-xs">Groq ⚡</TabsTrigger>
              <TabsTrigger value="perplexity" className="text-xs">Perplexity 🌐</TabsTrigger>
              <TabsTrigger value="gemini" className="text-xs">Gemini 🧐</TabsTrigger>
              <TabsTrigger value="openrouter" className="text-xs">OpenRouter 🎯</TabsTrigger>
            </TabsList>

            <TabsContent value="groq" className="space-y-4">
              {renderKeyInputs(
                'Groq ⚡ Speed & Real-Time',
                'Ultra-fast responses for interactive chatbots (tries first for speed)',
                groqKeys,
                'groq',
                'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'bg-orange-500'
              )}
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-sm text-orange-800">
                  <div className="font-medium mb-1">Perfect for:</div>
                  <div>• Real-time conversations • Quick responses • Interactive elements</div>
                  <div className="text-xs mt-2 opacity-80">
                    Get your key: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com/keys</a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="perplexity" className="space-y-4">
              {renderKeyInputs(
                'Perplexity 🌐 Up-to-Date & Factual',
                'Web-enhanced responses with current information and sourcing',
                perplexityKeys,
                'perplexity',
                'pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'bg-blue-500'
              )}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-sm text-blue-800">
                  <div className="font-medium mb-1">Perfect for:</div>
                  <div>• Current events • Research questions • Fact-checking • News updates</div>
                  <div className="text-xs mt-2 opacity-80">
                    Get your key: <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="underline">perplexity.ai/settings/api</a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gemini" className="space-y-4">
              {renderKeyInputs(
                'Gemini 🧐 Complex Reasoning',
                'Advanced reasoning for creative writing and complex instructions',
                geminiKeys,
                'gemini',
                'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'bg-emerald-500'
              )}
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 text-sm text-emerald-800">
                  <div className="font-medium mb-1">Perfect for:</div>
                  <div>• Creative writing • Complex analysis • Multi-step reasoning • Educational content</div>
                  <div className="text-xs mt-2 opacity-80">
                    Get your key: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">makersuite.google.com/app/apikey</a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="openrouter" className="space-y-4">
              {renderKeyInputs(
                'OpenRouter 🎯 Specialized Tasks',
                'Access to multiple specialized models for niche tasks and flexibility',
                openrouterKeys,
                'openrouter',
                'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'bg-indigo-500'
              )}
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-4 text-sm text-indigo-800">
                  <div className="font-medium mb-1">Perfect for:</div>
                  <div>• Specialized tasks • Model variety • Code generation • Translation</div>
                  <div className="text-xs mt-2 opacity-80">
                    Get your key: <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/keys</a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" weight="fill" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-foreground mb-1">🚀 Sequential Strategy (Fast)</div>
                  <div>Groq → Gemini → OpenRouter → Spark LLM</div>
                  <div className="text-xs opacity-80 mt-1">Tries services in order until one succeeds</div>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">🔄 Parallel Strategy (Comprehensive)</div>
                  <div>All services respond simultaneously</div>
                  <div className="text-xs opacity-80 mt-1">AI judges best response for quality</div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="font-medium text-foreground mb-1">💡 Key Management:</div>
                <div>• Automatic rotation when rate limits hit • Multiple keys per service • Spark LLM always available as fallback</div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}