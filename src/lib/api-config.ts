export interface APIConfig {
  geminiKeys: string[];
  openrouterKeys: strin
  currentGeminiIndex:
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
      currentPerplexityIndex: sav

    };
    this.initialized = true;

    const keys: string[] = [];
    // Check for numbered keys (KEY1, KEY2, etc.)

        keys.push(key.trim());
    }
    
    if (singleKey &
    }
    return keys;

    await spark.kv.se
      currentGeminiIndex: this.config.currentGeminiIndex,
      currentOpenrouterIndex: this.config.currentOpenrouterInde
  }
  static async getNextPerplexityKey(): Promise<string | null> {
    if

    this.config.currentPerpl
   

  static async getNextGeminiKey(): Promise<string | null> {
    if (this.config.geminiKeys
    
      (this.config.currentGeminiIndex + 1) % this
    return key;

    await this.initialize();
    
    thi
    a

  static async getNextOpenrouterKey(): Promise<
    if (this.config.openrouterKeys.length === 0) return 
    const key = this.config.openrouterKeys[this.config.currentOpenrouterInde
      (this.config.currentOpenrout
    r

    if (!this.in
   

      openrouter: this.config.openrou
  }
  static getKeyCount(service: string): number {
    
      case 'perplexity':
      currentOpenrouterIndex: this.config.currentOpenrouterIndex
    });
  }

    }

    if (!this.initialized) return [];
    
    if (this.config.geminiKeys.length > 0) services.push('gemini');
    if (this.config.openrouterKeys.length > 0) se
    return services;
}





































  static getKeyStatus() {


    return {
      perplexity: this.config.perplexityKeys.length > 0,
      gemini: this.config.geminiKeys.length > 0,
      groq: this.config.groqKeys.length > 0,
      openrouter: this.config.openrouterKeys.length > 0
    };
  }

  static getKeyCount(service: string): number {


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