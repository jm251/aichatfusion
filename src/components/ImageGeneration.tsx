import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Sparkles, Upload, Download, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImageGenerationService } from '@/lib/image-generation-service';
import { motion, AnimatePresence } from 'framer-motion';

export function ImageGeneration() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      setUploadedImage(file);
      toast.success('Image uploaded');
    }
    event.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setResponseText('');

    try {
      const imageToUse: File | string | undefined = uploadedImage ?? undefined;
      const response = await ImageGenerationService.generateImage({
        prompt,
        image: imageToUse,
        model: 'openai/dall-e-3',
      });

      if (response.success) {
        if (response.imageUrl) {
          setGeneratedImage(response.imageUrl);
        } else if (response.imageData) {
          setGeneratedImage(`data:image/png;base64,${response.imageData}`);
        }
        if (response.text) {
          setResponseText(response.text);
        }
        toast.success('Image generated');
      } else {
        toast.error(response.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('An error occurred while generating the image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      if (generatedImage.startsWith('http')) {
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      window.open(generatedImage, '_blank');
      toast.info('Image opened in new tab');
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <Card className="border-border/70 bg-card/70 p-3 sm:p-4 shadow-none surface-enter">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base section-title">Image Studio</h2>
            <p className="text-xs section-subtitle">
              Generate or edit images from prompts with optional source image input.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleUploadClick}
            className="w-full rounded-xl border border-dashed border-border/80 bg-background/70 p-3 text-left transition hover:bg-muted/50"
          >
            <div className="flex items-start gap-2">
              <ImagePlus className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Upload source image (optional)</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">PNG/JPG up to 10MB</p>
          </button>

          {uploadedImage && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="truncate text-xs text-muted-foreground min-w-0">Attached: {uploadedImage.name}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setUploadedImage(null)}
                aria-label="Remove uploaded image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what to generate or how to edit your image..."
              className="min-h-[72px] max-h-[140px] resize-none text-sm bg-background/80 border-border/70"
              id="prompt-textarea"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            size="sm"
          >
            {isGenerating ? (
              <>
                <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate image
              </>
            )}
          </Button>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto image-gen-results">
        <AnimatePresence>
          {(generatedImage || responseText) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-border/70 bg-card/70 p-3 sm:p-4 shadow-none surface-enter surface-enter-delay-1">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base section-title">Result</h3>
                    <p className="text-xs section-subtitle">Generated by OpenAI image model</p>
                  </div>
                  {generatedImage && (
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                       className="h-8 text-xs border-border/70 w-full sm:w-auto"
                     >
                       <Download className="mr-1.5 h-3.5 w-3.5" />
                       Download
                    </Button>
                  )}
                </div>

                {generatedImage && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-border/70 bg-background/70 p-1">
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full max-h-[65vh] rounded-lg object-contain"
                    />
                  </div>
                )}

                {responseText && (
                  <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-foreground whitespace-pre-wrap">{responseText}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
