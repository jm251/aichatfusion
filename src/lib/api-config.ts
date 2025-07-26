export interface APIConfig {
  perplexityKeys: string[];
  geminiKeys: string[];
  groqKeys: string[];
  openrouterKeys: string[];
  currentPerplexityIndex: number;
  currentGeminiIndex: number;
  currentGroqIndex: number;
  currentOpenrouterIndex: number;
}

export class APIConfigService {
  private static config: APIConfig = {
    perplexityKeys: [],
    geminiKeys: [],
    groqKeys: [],
    openrouterKeys: [],
    currentPerplexityIndex: 0,
    currentGeminiIndex: 0,
    currentGroqIndex: 0,
    currentOpenrouterIndex: 0
  };

  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    // Try to load from saved configuration first
    const savedKeys = await spark.kv.get<{
      perplexityKeys?: string[], 
      geminiKeys?: string[],
      groqKeys?: string[],
      openrouterKeys?: string[]
    }>('api-keys');
    
    if (savedKeys) {
      this.config.perplexityKeys = savedKeys.perplexityKeys || [];
      this.config.geminiKeys = savedKeys.geminiKeys || [];
      this.config.groqKeys = savedKeys.groqKeys || [];
      this.config.openrouterKeys = savedKeys.openrouterKeys || [];
    } else {
      // Initialize with empty arrays
      this.config.perplexityKeys = [];
      this.config.geminiKeys = [];
      this.config.groqKeys = [];
      this.config.openrouterKeys = [];
    }

    // Load current indices from storage
    const savedConfig = await spark.kv.get<Partial<APIConfig>>('api-config');
    if (savedConfig) {
      this.config.currentPerplexityIndex = savedConfig.currentPerplexityIndex || 0;
      this.config.currentGeminiIndex = savedConfig.currentGeminiIndex || 0;
      this.config.currentGroqIndex = savedConfig.currentGroqIndex || 0;
      this.config.currentOpenrouterIndex = savedConfig.currentOpenrouterIndex || 0;
    }

    this.initialized = true;
  }

  static async setAPIKeys(service: 'perplexity' | 'gemini' | 'groq' | 'openrouter', keys: string[]) {
    await this.initialize();
    
    switch (service) {
      case 'perplexity':
        this.config.perplexityKeys = keys.filter(key => key.trim().length > 0);
        break;
      case 'gemini':
        this.config.geminiKeys = keys.filter(key => key.trim().length > 0);
        break;
      case 'groq':
        this.config.groqKeys = keys.filter(key => key.trim().length > 0);
        break;
      case 'openrouter':
        this.config.openrouterKeys = keys.filter(key => key.trim().length > 0);
        break;
    }
    
    // Save to storage
    await spark.kv.set('api-keys', {
      perplexityKeys: this.config.perplexityKeys,
      geminiKeys: this.config.geminiKeys,
      groqKeys: this.config.groqKeys,
      openrouterKeys: this.config.openrouterKeys
    });
  }

  static async getNextKey(service: 'perplexity' | 'gemini' | 'groq' | 'openrouter'): Promise<string | null> {
    await this.initialize();
    
    switch (service) {
      case 'perplexity':
        if (this.config.perplexityKeys.length === 0) return null;
        const pKey = this.config.perplexityKeys[this.config.currentPerplexityIndex];
        this.config.currentPerplexityIndex = (this.config.currentPerplexityIndex + 1) % this.config.perplexityKeys.length;
        await this.saveConfig();
        return pKey;
        
      case 'gemini':
        if (this.config.geminiKeys.length === 0) return null;
        const gKey = this.config.geminiKeys[this.config.currentGeminiIndex];
        this.config.currentGeminiIndex = (this.config.currentGeminiIndex + 1) % this.config.geminiKeys.length;
        await this.saveConfig();
        return gKey;
        
      case 'groq':
        if (this.config.groqKeys.length === 0) return null;
        const grKey = this.config.groqKeys[this.config.currentGroqIndex];
        this.config.currentGroqIndex = (this.config.currentGroqIndex + 1) % this.config.groqKeys.length;
        await this.saveConfig();
        return grKey;
        
      case 'openrouter':
        if (this.config.openrouterKeys.length === 0) return null;
        const orKey = this.config.openrouterKeys[this.config.currentOpenrouterIndex];
        this.config.currentOpenrouterIndex = (this.config.currentOpenrouterIndex + 1) % this.config.openrouterKeys.length;
        await this.saveConfig();
        return orKey;
        
      default:
        return null;
    }
  }

  // Legacy methods for backward compatibility
  static async getNextPerplexityKey(): Promise<string | null> {
    return this.getNextKey('perplexity');
  }

  static async getNextGeminiKey(): Promise<string | null> {
    return this.getNextKey('gemini');
  }

  static async markKeyAsFailed(service: 'perplexity' | 'gemini' | 'groq' | 'openrouter', failedKey: string) {
    await this.initialize();
    
    switch (service) {
      case 'perplexity':
        const pFailedIndex = this.config.perplexityKeys.indexOf(failedKey);
        if (pFailedIndex !== -1) {
          this.config.currentPerplexityIndex = (pFailedIndex + 1) % this.config.perplexityKeys.length;
        }
        break;
      case 'gemini':
        const gFailedIndex = this.config.geminiKeys.indexOf(failedKey);
        if (gFailedIndex !== -1) {
          this.config.currentGeminiIndex = (gFailedIndex + 1) % this.config.geminiKeys.length;
        }
        break;
      case 'groq':
        const grFailedIndex = this.config.groqKeys.indexOf(failedKey);
        if (grFailedIndex !== -1) {
          this.config.currentGroqIndex = (grFailedIndex + 1) % this.config.groqKeys.length;
        }
        break;
      case 'openrouter':
        const orFailedIndex = this.config.openrouterKeys.indexOf(failedKey);
        if (orFailedIndex !== -1) {
          this.config.currentOpenrouterIndex = (orFailedIndex + 1) % this.config.openrouterKeys.length;
        }
        break;
    }
    
    await this.saveConfig();
  }

  private static async saveConfig() {
    await spark.kv.set('api-config', {
      currentPerplexityIndex: this.config.currentPerplexityIndex,
      currentGeminiIndex: this.config.currentGeminiIndex,
      currentGroqIndex: this.config.currentGroqIndex,
      currentOpenrouterIndex: this.config.currentOpenrouterIndex
    });
  }

  static getAvailableServices(): { 
    perplexity: boolean; 
    gemini: boolean; 
    groq: boolean; 
    openrouter: boolean;
  } {
    return {
      perplexity: this.config.perplexityKeys.length > 0,
      gemini: this.config.geminiKeys.length > 0,
      groq: this.config.groqKeys.length > 0,
      openrouter: this.config.openrouterKeys.length > 0
    };
  }

  static async getConfiguredKeys(): Promise<{
    perplexityKeys: string[], 
    geminiKeys: string[],
    groqKeys: string[],
    openrouterKeys: string[]
  }> {
    await this.initialize();
    return {
      perplexityKeys: [...this.config.perplexityKeys],
      geminiKeys: [...this.config.geminiKeys],
      groqKeys: [...this.config.groqKeys],
      openrouterKeys: [...this.config.openrouterKeys]
    };
  }
}