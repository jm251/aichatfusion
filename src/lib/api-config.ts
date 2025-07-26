export interface APIConfig {
  perplexityKeys: string[];
  groqKeys: string[];
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
  };
    groqKeys: [],

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
    a

    await this.initialize();
    if (this.config.perplexityKeys
    const key = this.config.perplexity
    // Rotate to next key for subseque
      (this.config.currentPerplexityIn
    await this.saveConfig();
  }

    

    
    this.config.currentGeminiIndex
    
    return key;

    await this.initialize();
    if (this.config.groqKeys.len
    const key = this.config.groq
    // Rotate to next key for su
      (this.config.currentGroqI
    await this.saveConfig();

  static async getNextOpenrouterKe
    

    
    this.config.currentOpenrouterInde
    


    await this.initialize();
   

          // Move to next key if current one failed
            (failedPerplexit
    
        const failedGeminiIndex = this.config.geminiKeys.inde

            (failedGeminiIndex + 1) % this.config.geminiKeys.length;
    
        const failedGroqIndex = this.config.gr
          // Move to next key if current 
            (failedGroqIndex + 1) % this.config.groqKeys.length;
    
        const failedOpenrout
          // Mo
   

    
  }
  pr
      currentPerplexityIndex: this.config.currentPerplexi

    });

    return {
      gemini: this.config.geminiKeys.
      openrouter: this.config.openrouterKeys.length > 0
  }
  static getKeyCount(service
      case 'per
   

      case 'openrouter':
      default:
    
}



































































































