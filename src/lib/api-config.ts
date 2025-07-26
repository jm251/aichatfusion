export interface APIConfig {
  geminiKeys: string[];
  openrouterKeys: strin
  currentGeminiIndex:
  openrouterKeys: string[];
  currentPerplexityIndex: number;
  currentGeminiIndex: number;
  currentGroqIndex: number;
    if (this.initialized) return;
 

      perplexityKeys: this.e
      groqKeys: this.extractKeys('G
      currentPerplexityIndex: savedIn

    };
    this.initialized = true;

    const keys: string[] = [];
    // Check for numbered keys (KEY1, KEY2, etc.)
    
        keys.push(k
    }
    // Check for single key without number
    if (singleKey && singleKey.trim() && !keys.in
    }
    return keys;

    await spark.kv.set('api-key-indices', {
      currentGeminiIndex: this.config.currentGeminiIndex,
      

    this.initialized = true;
   

    this.config.currentPerplexityIndex = 
    
    

    if (!this.initialized) await th
    if (this.config.geminiKeys.length === 0) return 
    const key = this.config.ge
      (this.config.currentGemi
    awa
  }
  st
    
    
    this.config.currentGroqIndex = 
    
    r

    if (!this.in
   

      (this.config.currentOpenrouterIn
    await this.saveIndices();
  }
  static async getAvailableServices(): Promise<string[]> 
    
    
    if 
   


    if (!this.initialized) await this.initialize();
    
      gemini: this.config.geminiKeys.length > 0,
    
  }
  static getKeyCount(service: string): nu
    
    
      case 'gemini':
      case 'gro
   

    }
}





















































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