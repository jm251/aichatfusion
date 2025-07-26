import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Eye, EyeSlash, Plus, Trash, Save } from '@phosphor-icons/react';
import { APIConfigService } from '@/lib/api-config';
import { toast } from 'sonner';

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [perplexityKeys, setPerplexityKeys] = useState<string[]>(['']);
  const [geminiKeys, setGeminiKeys] = useState<string[]>(['']);
  const [showKeys, setShowKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCurrentKeys();
    }
  }, [open]);

  const loadCurrentKeys = async () => {
    try {
      const keys = await APIConfigService.getConfiguredKeys();
      setPerplexityKeys(keys.perplexityKeys.length > 0 ? keys.perplexityKeys : ['']);
      setGeminiKeys(keys.geminiKeys.length > 0 ? keys.geminiKeys : ['']);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const addKeyField = (service: 'perplexity' | 'gemini') => {
    if (service === 'perplexity') {
      setPerplexityKeys([...perplexityKeys, '']);
    } else {
      setGeminiKeys([...geminiKeys, '']);
    }
  };

  const removeKeyField = (service: 'perplexity' | 'gemini', index: number) => {
    if (service === 'perplexity') {
      const newKeys = perplexityKeys.filter((_, i) => i !== index);
      setPerplexityKeys(newKeys.length > 0 ? newKeys : ['']);
    } else {
      const newKeys = geminiKeys.filter((_, i) => i !== index);
      setGeminiKeys(newKeys.length > 0 ? newKeys : ['']);
    }
  };

  const updateKey = (service: 'perplexity' | 'gemini', index: number, value: string) => {
    if (service === 'perplexity') {
      const newKeys = [...perplexityKeys];
      newKeys[index] = value;
      setPerplexityKeys(newKeys);
    } else {
      const newKeys = [...geminiKeys];
      newKeys[index] = value;
      setGeminiKeys(newKeys);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Filter out empty keys
      const validPerplexityKeys = perplexityKeys.filter(key => key.trim().length > 0);
      const validGeminiKeys = geminiKeys.filter(key => key.trim().length > 0);

      await APIConfigService.setAPIKeys('perplexity', validPerplexityKeys);
      await APIConfigService.setAPIKeys('gemini', validGeminiKeys);

      toast.success(`Saved ${validPerplexityKeys.length} Perplexity and ${validGeminiKeys.length} Gemini keys`);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to save API keys');
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const maskKey = (key: string) => {
    if (!showKeys && key.length > 8) {
      return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
    }
    return key;
  };

  const renderKeyInputs = (
    title: string,
    description: string,
    keys: string[],
    service: 'perplexity' | 'gemini',
    placeholder: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API Key Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
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

          {renderKeyInputs(
            'Perplexity AI Keys',
            'Add your Perplexity API keys for web-enhanced responses',
            perplexityKeys,
            'perplexity',
            'pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
          )}

          {renderKeyInputs(
            'Google Gemini Keys',
            'Add your Google Gemini API keys for advanced reasoning',
            geminiKeys,
            'gemini',
            'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
          )}

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Add multiple API keys for automatic rotation when rate limits are reached</p>
              <p>• Perplexity keys: Get them from <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">perplexity.ai/settings/api</a></p>
              <p>• Gemini keys: Get them from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">makersuite.google.com/app/apikey</a></p>
              <p>• Leave empty if you don't have keys for a particular service</p>
              <p>• Spark LLM is always available as a fallback</p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Keys'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}