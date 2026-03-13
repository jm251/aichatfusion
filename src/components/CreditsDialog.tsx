import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';
import { Credits } from './Credits';

export function CreditsDialog() {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 border border-transparent hover:border-border/70 hover:bg-card/70">
          <Info className="w-4 h-4 " />
          <span className="hidden sm:inline">About</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        ref={contentRef}
        className="w-[calc(100vw-1rem)] max-w-[95vw] xs:max-w-[88vw] lg:max-w-5xl max-h-[94vh] border border-border/70 bg-card/95 backdrop-blur-sm"
        aria-describedby="credits-dialog-description"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b border-border/60 pb-3 pr-12 sm:pr-0 surface-enter">
          <DialogTitle className="section-title text-xl">About AI Chat Fusion</DialogTitle>
          <DialogDescription id="credits-dialog-description" className="section-subtitle">
            Credits and acknowledgements for the AI Chat Fusion project.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[72vh] pr-2 sm:pr-4 pb-1">
          <Credits />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
