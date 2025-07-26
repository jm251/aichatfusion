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

export class APIKeyManager {
  private static config: APIConfig;
  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    // Load saved indices or initialize to 0
    const savedIndices = await spark.kv.get<Partial<APIConfig>>('api-key-indices');
    
    this.config = {
      perplexityKeys: this.extractKeys('PERPLEXITY_API_KEY'),
      geminiKeys: this.extractKeys('GOOGLE_API_KEY'),
      groqKeys: this.extractKeys('GROQ_API_KEY'),
      openrouterKeys: this.extractKeys('OPENROUTER_API_KEY'),
      currentPerplexityIndex: savedIndices?.currentPerplexityIndex || 0,
      currentGeminiIndex: savedIndices?.currentGeminiIndex || 0,
      currentGroqIndex: savedIndices?.currentGroqIndex || 0,
      currentOpenrouterIndex: savedIndices?.currentOpenrouterIndex || 0
    };

    this.initialized = true;
  }

  private static extractKeys(baseKey: string): string[] {
    const keys: string[] = [];
    
    // Check for numbered keys (KEY1, KEY2, etc.)
    for (let i = 1; i <= 10; i++) {
      const key = (window as any)[`${baseKey}${i}`];
      if (key && key.trim()) {
        keys.push(key.trim());
      }
    }
    
    // Check for single key without number
    const singleKey = (window as any)[baseKey];
    if (singleKey && singleKey.trim() && !keys.includes(singleKey.trim())) {
      keys.push(singleKey.trim());
    }
    
    return keys;
  }

  private static async saveIndices() {
    await spark.kv.set('api-key-indices', {
      currentPerplexityIndex: this.config.currentPerplexityIndex,
      currentGeminiIndex: this.config.currentGeminiIndex,
      currentGroqIndex: this.config.currentGroqIndex,
      currentOpenrouterIndex: this.config.currentOpenrouterIndex
    });
  }

  static async getNextPerplexityKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();
    
    if (this.config.perplexityKeys.length === 0) return null;
    
    const key = this.config.perplexityKeys[this.config.currentPerplexityIndex];
    this.config.currentPerplexityIndex = 
      (this.config.currentPerplexityIndex + 1) % this.config.perplexityKeys.length;
    
    await this.saveIndices();
    return key;
  }

  static async getNextGeminiKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();
    
    if (this.config.geminiKeys.length === 0) return null;
    
    const key = this.config.geminiKeys[this.config.currentGeminiIndex];
    this.config.currentGeminiIndex = 
      (this.config.currentGeminiIndex + 1) % this.config.geminiKeys.length;
    
    await this.saveIndices();
    return key;
  }

  static async getNextGroqKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();
    
    if (this.config.groqKeys.length === 0) return null;
    
    const key = this.config.groqKeys[this.config.currentGroqIndex];
    this.config.currentGroqIndex = 
      (this.config.currentGroqIndex + 1) % this.config.groqKeys.length;
    
    await this.saveIndices();
    return key;
  }

  static async getNextOpenrouterKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();
    
    if (this.config.openrouterKeys.length === 0) return null;
    
    const key = this.config.openrouterKeys[this.config.currentOpenrouterIndex];
    this.config.currentOpenrouterIndex = 
      (this.config.currentOpenrouterIndex + 1) % this.config.openrouterKeys.length;
    
    await this.saveIndices();
    return key;
  }

  static async getAvailableServices(): Promise<string[]> {
    if (!this.initialized) await this.initialize();
    
    const services: string[] = [];
    
    if (this.config.perplexityKeys.length > 0) services.push('perplexity');
    if (this.config.geminiKeys.length > 0) services.push('gemini');
    if (this.config.groqKeys.length > 0) services.push('groq');
    if (this.config.openrouterKeys.length > 0) services.push('openrouter');
    
    return services;
  }

  static async getKeyStatus() {
    if (!this.initialized) await this.initialize();
    
    return {
      perplexity: this.config.perplexityKeys.length > 0,
      gemini: this.config.geminiKeys.length > 0,
      groq: this.config.groqKeys.length > 0,
      openrouter: this.config.openrouterKeys.length > 0
    };
  }

  static getKeyCount(service: string): number {
    if (!this.initialized) return 0;
    
    switch (service) {
      case 'perplexity':
        return this.config.perplexityKeys.length;
      case 'gemini':
        return this.config.geminiKeys.length;
      case 'groq':
        return this.config.groqKeys.length;
      case 'openrouter':
        return this.config.openrouterKeys.length;
      default:
        return 0;
    }
  }
}