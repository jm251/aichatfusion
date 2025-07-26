export interface APIConfig {
  geminiKeys: string[];
  geminiKeys: string[];
  currentPerplexityIndex: number;
  currentOpenrouterIndex: num


    geminiKeys: [],
  private static config: APIConfig = {
    perplexityKeys: [],
    geminiKeys: [],
    currentPerplexityIndex: 0,
    currentGeminiIndex: 0
  };

  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    // Initialize API keys from environment variables
    this.config.perplexityKeys = [
      process.env.PERPLEXITY_API_KEY1,
      process.env.PERPLEXITY_API_KEY2,
      process.env.PERPLEXITY_API_KEY3,
      process.env.PERPLEXITY_API_KEY4
    ].filter(Boolean) as string[];

    this.config.geminiKeys = [
      process.env.GOOGLE_API_KEY1,

      process.env.GOOGLE_API_KEY3,
      process.env.GOOGLE_API_KEY4
    ].filter(Boolean) as string[];

        break;
        this.config.groqKeys = keys.filter(key => key.trim().length > 0);
      case 'openrouter
        break;
    
    a

      openrouterKeys: this.c
  }

    
      case 'perplexity':
    
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
      groqKeys: [...this.config.groqKeys],
    });
}

  static getAvailableServices(): { perplexity: boolean; gemini: boolean } {
    return {
      perplexity: this.config.perplexityKeys.length > 0,
      gemini: this.config.geminiKeys.length > 0

  }
