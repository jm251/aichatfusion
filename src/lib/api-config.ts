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

    // Load saved config from storage
    const savedConfig = await spark.kv.get<Partial<APIConfig>>('api-config');
    if (savedConfig) {
      Object.assign(this.config, savedConfig);
    }

    // Initialize API keys from environment variables
    this.config.perplexityKeys = [
      process.env.PERPLEXITY_API_KEY1,
      process.env.PERPLEXITY_API_KEY2,
      process.env.PERPLEXITY_API_KEY3,
      process.env.PERPLEXITY_API_KEY4
    ].filter(Boolean) as string[];

    this.config.geminiKeys = [
      process.env.GOOGLE_API_KEY1,
      process.env.GOOGLE_API_KEY2,
      process.env.GOOGLE_API_KEY3,
      process.env.GOOGLE_API_KEY4
    ].filter(Boolean) as string[];

    this.config.groqKeys = [
      process.env.GROQ_API_KEY1,
      process.env.GROQ_API_KEY2,
      process.env.GROQ_API_KEY3,
      process.env.GROQ_API_KEY4
    ].filter(Boolean) as string[];

    this.config.openrouterKeys = [
      process.env.OPENROUTER_API_KEY1,
      process.env.OPENROUTER_API_KEY2,
      process.env.OPENROUTER_API_KEY3,
      process.env.OPENROUTER_API_KEY4
    ].filter(Boolean) as string[];

    this.initialized = true;
    await this.saveConfig();
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

  static async getNextGroqKey(): Promise<string | null> {
    await this.initialize();
    
    if (this.config.groqKeys.length === 0) return null;

    const key = this.config.groqKeys[this.config.currentGroqIndex];
    
    // Rotate to next key for subsequent calls
    this.config.currentGroqIndex = 
      (this.config.currentGroqIndex + 1) % this.config.groqKeys.length;
    
    await this.saveConfig();
    return key;
  }

  static async getNextOpenrouterKey(): Promise<string | null> {
    await this.initialize();
    
    if (this.config.openrouterKeys.length === 0) return null;

    const key = this.config.openrouterKeys[this.config.currentOpenrouterIndex];
    
    // Rotate to next key for subsequent calls
    this.config.currentOpenrouterIndex = 
      (this.config.currentOpenrouterIndex + 1) % this.config.openrouterKeys.length;
    
    await this.saveConfig();
    return key;
  }

  static async markKeyAsFailed(service: 'perplexity' | 'gemini' | 'groq' | 'openrouter', failedKey: string) {
    await this.initialize();
    
    switch (service) {
      case 'perplexity':
        const failedPerplexityIndex = this.config.perplexityKeys.indexOf(failedKey);
        if (failedPerplexityIndex !== -1) {
          // Move to next key if current one failed
          this.config.currentPerplexityIndex = 
            (failedPerplexityIndex + 1) % this.config.perplexityKeys.length;
        }
        break;
      case 'gemini':
        const failedGeminiIndex = this.config.geminiKeys.indexOf(failedKey);
        if (failedGeminiIndex !== -1) {
          // Move to next key if current one failed
          this.config.currentGeminiIndex = 
            (failedGeminiIndex + 1) % this.config.geminiKeys.length;
        }
        break;
      case 'groq':
        const failedGroqIndex = this.config.groqKeys.indexOf(failedKey);
        if (failedGroqIndex !== -1) {
          // Move to next key if current one failed
          this.config.currentGroqIndex = 
            (failedGroqIndex + 1) % this.config.groqKeys.length;
        }
        break;
      case 'openrouter':
        const failedOpenrouterIndex = this.config.openrouterKeys.indexOf(failedKey);
        if (failedOpenrouterIndex !== -1) {
          // Move to next key if current one failed
          this.config.currentOpenrouterIndex = 
            (failedOpenrouterIndex + 1) % this.config.openrouterKeys.length;
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

  static getAvailableServices(): { perplexity: boolean; gemini: boolean; groq: boolean; openrouter: boolean } {
    return {
      perplexity: this.config.perplexityKeys.length > 0,
      gemini: this.config.geminiKeys.length > 0,
      groq: this.config.groqKeys.length > 0,
      openrouter: this.config.openrouterKeys.length > 0
    };
  }

  static getKeyCount(service: 'perplexity' | 'gemini' | 'groq' | 'openrouter'): number {
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