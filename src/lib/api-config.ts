export interface APIConfig {
  perplexityKeys: string[];
  openrouterKeys: strin
  currentGeminiIndex:
  openrouterKeys: string[];
  currentPerplexityIndex: number;
  currentGeminiIndex: number;
  currentGroqIndex: number;
    openrouterKeys: [],
 



    if (this.initialize
    // Load saved c
    if (savedConf
    }
    this.initialized = true;

    await this.initializ
    
    

    return key;

    await this.initialize();
    

    await this.saveConfig();
  }
  static async getNext
    if (this.config.groqKeys.length === 0) ret
    }

    this.initialized = true;
  }

  static async getNextPerplexityKey(): Promise<string | null> {
    await this.initialize();
    if (this.config.perplexityKeys.length === 0) return null;
  }
    const key = this.config.perplexityKeys[this.config.currentPerplexityIndex];
    // Rotate to next key for subsequent requests
    this.config.currentPerplexityIndex = 
      (this.config.currentPerplexityIndex + 1) % this.config.perplexityKeys.length;
    await this.saveConfig();
    return key;
   

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
    
      currentOpenrouterIndex: this.config.currentOpenrouterIndex
  }
  static getKeyStatus() {
      perplexity: this.confi
      groq: thi
   

    switch (service) {
        return this.config.p
        return this.config.geminiKeys.length;
    
        return this.config.openrouterKeys.length;
        return 0;
  }
  static getAvailableService
  }
















































      currentOpenrouterIndex: this.config.currentOpenrouterIndex
    });
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