import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';
import { UserGuide } from './UserGuide';

export function BlogDialog() {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 border border-transparent hover:border-border/70 hover:bg-card/70">
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Guide</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        ref={contentRef}
        className="w-[calc(100vw-1rem)] max-w-[95vw] xs:max-w-[88vw] lg:max-w-5xl max-h-[94vh] border border-border/70 bg-card/95 backdrop-blur-sm"
        aria-describedby="blog-dialog-description"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b border-border/60 pb-3 surface-enter">
          <DialogTitle className="section-title text-xl">User Guide</DialogTitle>
          <DialogDescription id="blog-dialog-description" className="section-subtitle">
            Learn modes, tools, and best practices to get better responses faster.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] pr-2 sm:pr-4 pb-1">
          <UserGuide />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
