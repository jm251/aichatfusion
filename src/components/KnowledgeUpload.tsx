import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Trash2, Database, AlertCircle, FileUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VectorStore } from '@/lib/vector-store';
import { toast } from 'sonner';

interface KnowledgeDocument {
  id: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: number;
  chunkCount: number;
}

interface KnowledgeUploadProps {
  userId: string | null;
  onKnowledgeUpdate?: () => void;
}

export function KnowledgeUpload({ userId, onKnowledgeUpdate }: KnowledgeUploadProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    let isActive = true;
    const loadDocuments = async () => {
      try {
        const docs = await VectorStore.getDocuments(userId);
        if (isActive) setDocuments(docs);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };
    loadDocuments();
    return () => {
      isActive = false;
    };
  }, [userId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !userId) return;

    const file = files[0];
    const allowedTypes = ['.txt', '.md', '.markdown'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(fileExtension)) {
      toast.error(`Unsupported file type. Please upload ${allowedTypes.join(', ')} files.`);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    setCurrentFile(file.name);
    setUploadProgress(10);

    try {
      const content = await readFileContent(file);
      setUploadProgress(30);

      const docId = await VectorStore.processDocument(
        userId,
        content,
        {
          filename: file.name,
          type: fileExtension,
          size: file.size,
        },
        (progress) => {
          setUploadProgress(30 + (progress * 0.6));
        },
      );

      setUploadProgress(90);
      const chunkCount = await VectorStore.getDocumentChunkCount(userId, docId);

      const newDoc: KnowledgeDocument = {
        id: docId,
        filename: file.name,
        type: fileExtension,
        size: file.size,
        uploadedAt: Date.now(),
        chunkCount,
      };

      setDocuments((prev) => [...prev, newDoc]);
      setUploadProgress(100);
      toast.success(`Uploaded ${file.name} (${chunkCount} chunks created)`);
      onKnowledgeUpdate?.();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setCurrentFile('');
      }, 500);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!userId) return;
    try {
      await VectorStore.deleteDocument(userId, docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      toast.success('Document deleted');
      onKnowledgeUpdate?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!userId) {
    return (
      <Alert className="border-border/70 bg-background/70">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">
          Initializing authentication. Document upload will be available in a moment.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="h-full border-border/70 bg-card/70 shadow-none surface-enter">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base section-title">
          <Database className="h-5 w-5 text-primary" />
          Knowledge Base
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm section-subtitle">
          Upload text and markdown docs to ground AI responses in your own content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {!isUploading ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border border-dashed border-border/80 bg-background/70 p-4 sm:p-5 text-left transition hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <FileUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Upload document</p>
                <p className="text-xs text-muted-foreground">Accepted: .txt, .md, .markdown (max 5MB)</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="space-y-2 rounded-xl border border-border/70 bg-background/70 p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground truncate max-w-[70%]">Uploading {currentFile}</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold section-title">Documents</h4>
            <Badge variant="secondary" className="border border-border/70 bg-background/70">
              {documents.length} files
            </Badge>
          </div>

          {documents.length > 0 ? (
            <ScrollArea className="h-[220px] rounded-xl border border-border/70 bg-background/70">
              <div className="p-2 space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-border/70 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground break-words">
                          {formatFileSize(doc.size)} | {doc.chunkCount} chunks | {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-xl border border-border/70 bg-background/70 p-5 text-center text-sm text-muted-foreground">
              <Upload className="mx-auto mb-2 h-5 w-5 opacity-60" />
              No documents uploaded yet.
            </div>
          )}
        </div>

        <Alert className="border-border/70 bg-background/70">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Files are chunked and embedded automatically, then used as retrieval context for future prompts.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
