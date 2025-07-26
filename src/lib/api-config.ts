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

    // Load environment variables and convert to arrays
    const perplexityKeys = this.getKeysFromEnv('PERPLEXITY_API_KEY');
    const geminiKeys = this.getKeysFromEnv('GOOGLE_API_KEY');
    const groqKeys = this.getKeysFromEnv('GROQ_API_KEY');
    const openrouterKeys = this.getKeysFromEnv('OPENROUTER_API_KEY');

    // Load saved configuration or create new one
    const savedConfig = await spark.kv.get<APIConfig>('api-config');
    
    this.config = {
      perplexityKeys,
      geminiKeys,
      groqKeys,
      openrouterKeys,
      currentPerplexityIndex: savedConfig?.currentPerplexityIndex || 0,
      currentGeminiIndex: savedConfig?.currentGeminiIndex || 0,
      currentGroqIndex: savedConfig?.currentGroqIndex || 0,
      currentOpenrouterIndex: savedConfig?.currentOpenrouterIndex || 0
    };

    this.initialized = true;
  }

  private static getKeysFromEnv(prefix: string): string[] {
    const keys: string[] = [];
    
    // Check for numbered keys (KEY1, KEY2, etc.)
    for (let i = 1; i <= 10; i++) {
      const key = import.meta.env[`VITE_${prefix}${i}`];
      if (key && key.trim()) {
        keys.push(key.trim());
      }
    }

    // Also check for single key without number
    const singleKey = import.meta.env[`VITE_${prefix}`];
    if (singleKey && singleKey.trim() && !keys.includes(singleKey.trim())) {
      keys.push(singleKey.trim());
    }

    return keys;
  }

  private static async saveConfig() {
    await spark.kv.set('api-config', {
      currentPerplexityIndex: this.config.currentPerplexityIndex,
      currentGeminiIndex: this.config.currentGeminiIndex,
      currentGroqIndex: this.config.currentGroqIndex,
      currentOpenrouterIndex: this.config.currentOpenrouterIndex
    });
  }

  static async getNextPerplexityKey(): Promise<string | null> {
    await this.initialize();
    if (this.config.perplexityKeys.length === 0) return null;
    
    const key = this.config.perplexityKeys[this.config.currentPerplexityIndex];
    // Rotate to next key for subsequent requests
    this.config.currentPerplexityIndex = 
      (this.config.currentPerplexityIndex + 1) % this.config.perplexityKeys.length;
    await this.saveConfig();
    return key;
  }

  static async getNextGeminiKey(): Promise<string | null> {
    await this.initialize();
    if (this.config.geminiKeys.length === 0) return null;
    
    const key = this.config.geminiKeys[this.config.currentGeminiIndex];
    this.config.currentGeminiIndex = 
      (this.config.currentGeminiIndex + 1) % this.config.geminiKeys.length;
    await this.saveConfig();
    return key;
  }

  static async getNextGroqKey(): Promise<string | null> {
    await this.initialize();
    if (this.config.groqKeys.length === 0) return null;
    
    const key = this.config.groqKeys[this.config.currentGroqIndex];
    this.config.currentGroqIndex = 
      (this.config.currentGroqIndex + 1) % this.config.groqKeys.length;
    await this.saveConfig();
    return key;
  }

  static async getNextOpenrouterKey(): Promise<string | null> {
    await this.initialize();
    if (this.config.openrouterKeys.length === 0) return null;
    
    const key = this.config.openrouterKeys[this.config.currentOpenrouterIndex];
    this.config.currentOpenrouterIndex = 
      (this.config.currentOpenrouterIndex + 1) % this.config.openrouterKeys.length;
    await this.saveConfig();
    return key;
  }

  static getKeyStatus() {
    if (!this.initialized) return { perplexity: false, gemini: false, groq: false, openrouter: false };
    
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

  static getAvailableServices(): string[] {
    if (!this.initialized) return [];
    
    const services: string[] = [];
    if (this.config.perplexityKeys.length > 0) services.push('perplexity');
    if (this.config.geminiKeys.length > 0) services.push('gemini');
    if (this.config.groqKeys.length > 0) services.push('groq');
    if (this.config.openrouterKeys.length > 0) services.push('openrouter');
    
    return services;
  }
}