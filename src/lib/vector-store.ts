import { FirebaseService } from './firebase-service';

interface DocumentChunk {
  id: string;
  docId: string;
  content: string;
  embedding?: number[];
  metadata: {
    filename: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

interface DocumentMetadata {
  id: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: number;
  chunkCount: number;
}

export class VectorStore {
  private static readonly CHUNK_SIZE = 1000; // characters per chunk
  private static readonly CHUNK_OVERLAP = 200; // overlap between chunks
  private static readonly MAX_CONTEXT_CHUNKS = 5; // max chunks to include in context

  // Simple in-memory cache for embeddings (will be replaced with proper vector DB)
  private static embeddingsCache = new Map<string, DocumentChunk[]>();

  /**
   * Process and store a document
   */
  static async processDocument(
    userId: string,
    content: string,
    metadata: { filename: string; type: string; size: number },
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Split content into chunks
    const chunks = this.chunkText(content);
    onProgress?.(0.3);

    // Create chunk documents
    const chunkDocs: DocumentChunk[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk: DocumentChunk = {
        id: `${docId}_chunk_${i}`,
        docId,
        content: chunks[i],
        metadata: {
          filename: metadata.filename,
          chunkIndex: i,
          totalChunks: chunks.length
        }
      };

      // Generate embeddings (using simple TF-IDF for now, will integrate with embedding API later)
      chunk.embedding = await this.generateEmbedding(chunk.content);
      chunkDocs.push(chunk);

      onProgress?.(0.3 + (0.5 * (i + 1) / chunks.length));
    }

    // Store in cache (will be replaced with Firebase vector store)
    const userKey = `${userId}_docs`;
    const existingDocs = this.embeddingsCache.get(userKey) || [];
    this.embeddingsCache.set(userKey, [...existingDocs, ...chunkDocs]);

    // Store metadata in Firebase
    await FirebaseService.saveDocumentMetadata(userId, {
      id: docId,
      ...metadata,
      uploadedAt: Date.now(),
      chunkCount: chunks.length
    });

    onProgress?.(1);
    return docId;
  }

  /**
   * Chunk text into smaller pieces with overlap
   */
  private static chunkText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      if (currentLength + sentence.length > this.CHUNK_SIZE && currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Add overlap from the end of the previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-20).join(' '); // Last ~200 chars
        currentChunk = overlapWords + ' ' + sentence;
        currentLength = currentChunk.length;
      } else {
        currentChunk += ' ' + sentence;
        currentLength += sentence.length;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Generate embedding for text (simplified TF-IDF for now)
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    // Simplified embedding generation
    // In production, use OpenAI embeddings API or similar
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    
    // Calculate word frequencies
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      if (cleanWord) {
        wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
      }
    });

    // Create a simple vector (top 100 dimensions)
    const vector: number[] = [];
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);

    for (let i = 0; i < 100; i++) {
      if (i < sortedWords.length) {
        vector.push(sortedWords[i][1] / words.length); // Normalized frequency
      } else {
        vector.push(0);
      }
    }

    return vector;
  }

  /**
   * Search for relevant chunks based on query
   */
  static async searchRelevantChunks(
    userId: string,
    query: string,
    maxResults: number = 5
  ): Promise<DocumentChunk[]> {
    const userKey = `${userId}_docs`;
    const allChunks = this.embeddingsCache.get(userKey) || [];
    
    if (allChunks.length === 0) {
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarity scores
    const scoredChunks = allChunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding || [])
    }));

    // Sort by similarity and return top results
    scoredChunks.sort((a, b) => b.score - a.score);
    
    return scoredChunks
      .slice(0, maxResults)
      .filter(item => item.score > 0.1) // Minimum similarity threshold
      .map(item => item.chunk);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Get all documents for a user
   */
  static async getDocuments(userId: string): Promise<DocumentMetadata[]> {
    return FirebaseService.getUserDocuments(userId);
  }

  /**
   * Delete a document and its chunks
   */
  static async deleteDocument(userId: string, docId: string): Promise<void> {
    // Remove from cache
    const userKey = `${userId}_docs`;
    const chunks = this.embeddingsCache.get(userKey) || [];
    const filteredChunks = chunks.filter(chunk => chunk.docId !== docId);
    this.embeddingsCache.set(userKey, filteredChunks);

    // Remove from Firebase
    await FirebaseService.deleteDocument(userId, docId);
  }

  /**
   * Get chunk count for a document
   */
  static async getDocumentChunkCount(userId: string, docId: string): Promise<number> {
    const userKey = `${userId}_docs`;
    const chunks = this.embeddingsCache.get(userKey) || [];
    return chunks.filter(chunk => chunk.docId === docId).length;
  }

  /**
   * Build context from relevant chunks
   */
  static buildContext(chunks: DocumentChunk[]): string {
    if (chunks.length === 0) return '';

    const contextParts = chunks.map(chunk => 
      `[Source: ${chunk.metadata.filename}]\n${chunk.content}`
    );

    return `Based on the following context from your knowledge base:\n\n${contextParts.join('\n\n---\n\n')}\n\n`;
  }
}
