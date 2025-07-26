export interface APIConfig {
  perplexityKeys: string[];
  geminiKeys: string[];
  currentPerplexityIndex: number;
  currentGeminiIndex: number;
}

export class APIConfigService {
  private static config: APIConfig = {
    perplexityKeys: [],
    geminiKeys: [],
    currentPerplexityIndex: 0,
    currentGeminiIndex: 0
  };

  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    // In a browser environment, we need to get API keys from a different source
    // For now, we'll use placeholder keys or load from local storage
    // In production, these should be set through environment variables on the server
    
    // Try to load from saved configuration first
    const savedKeys = await spark.kv.get<{perplexityKeys?: string[], geminiKeys?: string[]}>('api-keys');
    
    if (savedKeys) {
      this.config.perplexityKeys = savedKeys.perplexityKeys || [];
      this.config.geminiKeys = savedKeys.geminiKeys || [];
    } else {
      // For demo purposes, initialize with empty arrays
      // Users should configure these through a settings interface
      this.config.perplexityKeys = [];
      this.config.geminiKeys = [];
    }

    // Load current indices from storage
    const savedConfig = await spark.kv.get<Partial<APIConfig>>('api-config');
    if (savedConfig) {
      this.config.currentPerplexityIndex = savedConfig.currentPerplexityIndex || 0;
      this.config.currentGeminiIndex = savedConfig.currentGeminiIndex || 0;
    }

    this.initialized = true;
  }

  static async setAPIKeys(service: 'perplexity' | 'gemini', keys: string[]) {
    await this.initialize();
    
    if (service === 'perplexity') {
      this.config.perplexityKeys = keys.filter(key => key.trim().length > 0);
    } else {
      this.config.geminiKeys = keys.filter(key => key.trim().length > 0);
    }
    
    // Save to storage
    await spark.kv.set('api-keys', {
      perplexityKeys: this.config.perplexityKeys,
      geminiKeys: this.config.geminiKeys
    });
  }

  static async getNextPerplexityKey(): Promise<string | null> {
    await this.initialize();
    
    if (this.config.perplexityKeys.length === 0) return null;

    const key = this.config.perplexityKeys[this.config.currentPerplexityIndex];
    
    // Rotate to next key for subsequent calls
    this.config.currentPerplexityIndex = 
      (this.config.currentPerplexityIndex + 1) % this.config.perplexityKeys.length;
    
    await this.saveConfig();
    return key;
  }

  static async getNextGeminiKey(): Promise<string | null> {
    await this.initialize();
    
    if (this.config.geminiKeys.length === 0) return null;

    const key = this.config.geminiKeys[this.config.currentGeminiIndex];
    
    // Rotate to next key for subsequent calls
    this.config.currentGeminiIndex = 
      (this.config.currentGeminiIndex + 1) % this.config.geminiKeys.length;
    
    await this.saveConfig();
    return key;
  }

  static async markKeyAsFailed(service: 'perplexity' | 'gemini', failedKey: string) {
    await this.initialize();
    
    if (service === 'perplexity') {
      const failedIndex = this.config.perplexityKeys.indexOf(failedKey);
      if (failedIndex !== -1) {
        // Move to next key if current one failed
        this.config.currentPerplexityIndex = 
          (failedIndex + 1) % this.config.perplexityKeys.length;
      }
    } else {
      const failedIndex = this.config.geminiKeys.indexOf(failedKey);
      if (failedIndex !== -1) {
        // Move to next key if current one failed
        this.config.currentGeminiIndex = 
          (failedIndex + 1) % this.config.geminiKeys.length;
      }
    }
    
    await this.saveConfig();
  }

  private static async saveConfig() {
    await spark.kv.set('api-config', {
      currentPerplexityIndex: this.config.currentPerplexityIndex,
      currentGeminiIndex: this.config.currentGeminiIndex
    });
  }

  static getAvailableServices(): { perplexity: boolean; gemini: boolean } {
    return {
      perplexity: this.config.perplexityKeys.length > 0,
      gemini: this.config.geminiKeys.length > 0
    };
  }

  static async getConfiguredKeys(): Promise<{perplexityKeys: string[], geminiKeys: string[]}> {
    await this.initialize();
    return {
      perplexityKeys: [...this.config.perplexityKeys],
      geminiKeys: [...this.config.geminiKeys]
    };
  }
}