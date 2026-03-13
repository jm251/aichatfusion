import { APIBackendClient } from './api-backend-client';

export interface APIConfig {
  geminiKeys: string[];
  groqKeys: string[];
  openrouterKeys: string[];
  githubKeys: string[];
  cohereKeys: string[];
  xaiKeys: string[];
  fastrouterKeys: string[];
  currentGeminiIndex: number;
  currentGroqIndex: number;
  currentOpenRouterIndex: number;
  currentGitHubIndex: number;
  currentCohereIndex: number;
  currentXAIIndex: number;
  currentFastRouterIndex: number;
}

export class APIConfigManager {
  private static config: APIConfig = {
    geminiKeys: [],
    groqKeys: [],
    openrouterKeys: [],
    githubKeys: [],
    cohereKeys: [],
    xaiKeys: [],
    fastrouterKeys: [],
    currentGeminiIndex: 0,
    currentGroqIndex: 0,
    currentOpenRouterIndex: 0,
    currentGitHubIndex: 0,
    currentCohereIndex: 0,
    currentXAIIndex: 0,
    currentFastRouterIndex: 0,
  };

  private static initialized = false;
  private static initPromise: Promise<void> | null = null; // Prevent duplicate init calls
  private static failedKeys: Set<string> = new Set();
  private static openaiKeys: string[] = [];
  private static openaiIndex = 0;
  private static useBackend = import.meta.env.VITE_USE_BACKEND === 'true' || !import.meta.env.VITE_GROQ_API_KEY;
  private static backendKeyCounts: Record<string, number> = {};

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Prevent duplicate initialization calls (race condition protection)
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private static async _doInitialize(): Promise<void> {
    try {
      if (this.useBackend) {
        // Initialize backend session
        await APIBackendClient.initSession();

        // Get service status from backend
        const status = await APIBackendClient.getServiceStatus();

        // Get actual key counts from backend
        const keyCounts = await APIBackendClient.getAllKeyCounts();
        this.backendKeyCounts = keyCounts;

        // We don't store actual keys, just track availability
        this.config = {
          geminiKeys: status.gemini ? ['backend'] : [],
          groqKeys: status.groq ? ['backend'] : [],
          openrouterKeys: status.openrouter ? ['backend'] : [],
          githubKeys: status.github ? ['backend'] : [],
          cohereKeys: status.cohere ? ['backend'] : [],
          xaiKeys: status.xai ? ['backend'] : [],
          fastrouterKeys: status.fastrouter ? ['backend'] : [],
          currentGeminiIndex: 0,
          currentGroqIndex: 0,
          currentOpenRouterIndex: 0,
          currentGitHubIndex: 0,
          currentCohereIndex: 0,
          currentXAIIndex: 0,
          currentFastRouterIndex: 0,
        };

        this.openaiKeys = status.openai ? ['backend'] : [];

      } else {
        // Original implementation for frontend-only mode
        let savedIndices: any = {};
        const savedData = localStorage.getItem('api-key-indices');
        if (savedData) {
          savedIndices = JSON.parse(savedData);
        }

        this.config = {
          geminiKeys: this.extractKeys('GOOGLE_API_KEY'),
          groqKeys: this.extractKeys('GROQ_API_KEY'),
          openrouterKeys: this.extractKeys('OPENROUTER_API_KEY'),
          githubKeys: this.extractKeys('GITHUB_TOKEN'),
          cohereKeys: this.extractKeys('COHERE_API_KEY'),
          xaiKeys: this.extractKeys('XAI_API_KEY'),
          fastrouterKeys: this.extractKeys('FASTROUTER_API_KEY'),
          currentGeminiIndex: savedIndices.currentGeminiIndex || 0,
          currentGroqIndex: savedIndices.currentGroqIndex || 0,
          currentOpenRouterIndex: savedIndices.currentOpenRouterIndex || 0,
          currentGitHubIndex: savedIndices.currentGitHubIndex || 0,
          currentCohereIndex: savedIndices.currentCohereIndex || 0,
          currentXAIIndex: savedIndices.currentXAIIndex || 0,
          currentFastRouterIndex: savedIndices.currentFastRouterIndex || 0,
        };

        this.openaiKeys = this.extractKeys('OPENAI_API_KEY');
        this.openaiIndex = savedIndices.currentOpenAIIndex || 0;
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize API Config Manager:", error instanceof Error ? error.message : String(error));
      this.initialized = true;
    }
  }

  private static extractKeys(baseKeyName: string): string[] {
    const keys = new Set<string>();

    const envVarMap: Record<string, string> = {
      'GOOGLE_API_KEY': 'VITE_GOOGLE_API_KEY',
      'GROQ_API_KEY': 'VITE_GROQ_API_KEY',
      'OPENAI_API_KEY': 'VITE_OPENAI_API_KEY',
      'OPENROUTER_API_KEY': 'VITE_OPENROUTER_API_KEY',
      'GITHUB_TOKEN': 'VITE_GITHUB_TOKEN',
      'COHERE_API_KEY': 'VITE_COHERE_API_KEY',
      'XAI_API_KEY': 'VITE_XAI_API_KEY',
      'FASTROUTER_API_KEY': 'VITE_FASTROUTER_API_KEY',
    };
    const base = envVarMap[baseKeyName] || `VITE_${baseKeyName}`;

    // Direct (base) key
    const direct = import.meta.env[base];
    if (direct && direct.trim()) keys.add(direct.trim());

    // Dynamically discover any variant: base + digits / underscores (e.g., KEY1, KEY2, KEY_3, KEY10, etc.)
    Object.keys(import.meta.env).forEach(k => {
      if (k === base) return;
      if (k.startsWith(base)) {
        const val = import.meta.env[k];
        if (val && typeof val === 'string' && val.trim()) {
          keys.add(val.trim());
        }
      }
    });

    return Array.from(keys);
  }

  static getAllKeyCounts(): Record<string, number> {
    if (!this.initialized) return {
      gemini: 0, groq: 0, openai: 0, openrouter: 0, github: 0, cohere: 0, xai: 0, fastrouter: 0, total: 0
    };
    const counts = {
      gemini: this.config.geminiKeys.length,
      groq: this.config.groqKeys.length,
      openai: this.openaiKeys.length,
      openrouter: this.config.openrouterKeys.length,
      github: this.config.githubKeys.length,
      cohere: this.config.cohereKeys.length,
      xai: this.config.xaiKeys.length,
      fastrouter: this.config.fastrouterKeys.length,
    };
    return { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  private static async saveIndices(): Promise<void> {
    try {
      const indices = {
        currentGeminiIndex: this.config.currentGeminiIndex,
        currentGroqIndex: this.config.currentGroqIndex,
        currentOpenRouterIndex: this.config.currentOpenRouterIndex,
        currentGitHubIndex: this.config.currentGitHubIndex,
        currentCohereIndex: this.config.currentCohereIndex,
        currentXAIIndex: this.config.currentXAIIndex,
        currentFastRouterIndex: this.config.currentFastRouterIndex,
        currentOpenAIIndex: this.openaiIndex,
      };

      localStorage.setItem('api-key-indices', JSON.stringify(indices));
    } catch (error) {
      console.error('Failed to save indices:', error);
    }
  }

  // NEW: explicit rotation instead of implicit advance-per-request
  static async rotateKey(service: 'groq' | 'gemini' | 'openai' | 'openrouter' | 'github' | 'cohere' | 'xai' | 'fastrouter'): Promise<void> {
    if (this.useBackend) {
      await APIBackendClient.rotateKey(service);
    } else {
      // Original implementation
      if (!this.initialized) await this.initialize();
      const c = this.config;
      const advance = (len: number, getter: () => number, setter: (v: number) => void) => {
        if (len === 0) return;
        setter((getter() + 1) % len);
      };
      switch (service) {
        case 'gemini':
          advance(c.geminiKeys.length, () => c.currentGeminiIndex, v => c.currentGeminiIndex = v);
          break;
        case 'groq':
          advance(c.groqKeys.length, () => c.currentGroqIndex, v => c.currentGroqIndex = v);
          break;
        case 'openrouter':
          advance(c.openrouterKeys.length, () => c.currentOpenRouterIndex, v => c.currentOpenRouterIndex = v);
          break;
        case 'github':
          advance(c.githubKeys.length, () => c.currentGitHubIndex, v => c.currentGitHubIndex = v);
          break;
        case 'cohere':
          advance(c.cohereKeys.length, () => c.currentCohereIndex, v => c.currentCohereIndex = v);
          break;
        case 'xai':
          advance(c.xaiKeys.length, () => c.currentXAIIndex, v => c.currentXAIIndex = v);
          break;
        case 'fastrouter':
          advance(c.fastrouterKeys.length, () => c.currentFastRouterIndex, v => c.currentFastRouterIndex = v);
          break;
        case 'openai':
          this.openaiIndex = (this.openaiIndex + 1) % Math.max(this.openaiKeys.length, 1);
          break;
        default:
          return;
      }
      await this.saveIndices();
    }
  }

  static async getNextFastRouterKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('fastrouter');
    }

    const { key, index } = this.getStableKey(this.config.fastrouterKeys, this.config.currentFastRouterIndex);
    this.config.currentFastRouterIndex = index;
    return key;
  }

  // Helper: get current non-failed key without rotating; skips failed ones
  private static getStableKey(list: string[], currentIndex: number): { key: string | null; index: number } {
    if (list.length === 0) return { key: null, index: currentIndex };
    let attempts = 0;
    let idx = currentIndex;
    while (attempts < list.length && this.failedKeys.has(list[idx])) {
      idx = (idx + 1) % list.length;
      attempts++;
    }
    return { key: list[idx], index: idx };
  }

  static async getNextGeminiKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('gemini');
    }

    const { key, index } = this.getStableKey(this.config.geminiKeys, this.config.currentGeminiIndex);
    this.config.currentGeminiIndex = index;
    return key;
  }

  static async getNextGroqKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('groq');
    }

    const { key, index } = this.getStableKey(this.config.groqKeys, this.config.currentGroqIndex);
    this.config.currentGroqIndex = index;
    return key;
  }

  static async getNextOpenRouterKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('openrouter');
    }

    const { key, index } = this.getStableKey(this.config.openrouterKeys, this.config.currentOpenRouterIndex);
    this.config.currentOpenRouterIndex = index;
    return key;
  }

  static async getNextGitHubKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('github');
    }

    const { key, index } = this.getStableKey(this.config.githubKeys, this.config.currentGitHubIndex);
    this.config.currentGitHubIndex = index;
    return key;
  }

  static async getNextCohereKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('cohere');
    }

    const { key, index } = this.getStableKey(this.config.cohereKeys, this.config.currentCohereIndex);
    this.config.currentCohereIndex = index;
    return key;
  }

  static async getNextXAIKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('xai');
    }

    const { key, index } = this.getStableKey(this.config.xaiKeys, this.config.currentXAIIndex);
    this.config.currentXAIIndex = index;
    return key;
  }

  static async getNextOpenAIKey(): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    if (this.useBackend) {
      return await APIBackendClient.getAPIKey('openai');
    }

    if (this.openaiKeys.length === 0) return null;

    const startIndex = this.openaiIndex;
    let attempts = 0;

    while (attempts < this.openaiKeys.length) {
      const key = this.openaiKeys[this.openaiIndex];
      this.openaiIndex = (this.openaiIndex + 1) % this.openaiKeys.length;

      if (!this.failedKeys.has(key)) {
        return key;
      }

      attempts++;
      if (this.openaiIndex === startIndex) {
        break;
      }
    }

    // All keys have failed, clear the failed set and try again
    if (this.openaiKeys.length > 0) {
      this.failedKeys.clear();
      return this.openaiKeys[0];
    }

    return null;
  }

  // ADDED: restore helper to list available services
  static async getAvailableServices(): Promise<string[]> {
    if (!this.initialized) await this.initialize();
    const services: string[] = [];
    if (this.config.geminiKeys.length > 0) services.push('gemini');
    if (this.config.groqKeys.length > 0) services.push('groq');
    if (this.config.openrouterKeys.length > 0) services.push('openrouter');
    if (this.config.githubKeys.length > 0) services.push('github');
    if (this.config.cohereKeys.length > 0) services.push('cohere');
    if (this.config.fastrouterKeys.length > 0) services.push('fastrouter');
    return services;
  }

  // ADDED: async status map (used by ai-service)
  static async getServiceStatus(): Promise<{
    groq: boolean;
    gemini: boolean;
    openai: boolean;
    openrouter: boolean;
    github: boolean;
    cohere: boolean;
    xai: boolean;
    fastrouter: boolean;
  }> {
    await this.initialize();
    return {
      groq: this.config.groqKeys.length > 0,
      gemini: this.config.geminiKeys.length > 0,
      openai: this.openaiKeys.length > 0,
      openrouter: this.config.openrouterKeys.length > 0,
      github: this.config.githubKeys.length > 0,
      cohere: this.config.cohereKeys.length > 0,
      xai: this.config.xaiKeys.length > 0,
      fastrouter: this.config.fastrouterKeys.length > 0,
    };
  }

  // ADDED: per-service key count (sync, original pattern)
  static getKeyCount(service: string): number {
    if (!this.initialized) return 0;

    if (this.useBackend) {
      // Return cached backend count if available
      return this.backendKeyCounts[service] || 0;
    }

    switch (service) {
      case 'groq': return this.config.groqKeys.length;
      case 'gemini': return this.config.geminiKeys.length;
      case 'openai': return this.openaiKeys.length;
      case 'openrouter': return this.config.openrouterKeys.length;
      case 'github': return this.config.githubKeys.length;
      case 'cohere': return this.config.cohereKeys.length;
      case 'xai': return this.config.xaiKeys.length;
      case 'fastrouter': return this.config.fastrouterKeys.length;
      default: return 0;
    }
  }

  // ADDED: total count (optional but previously present)
  static getTotalKeyCount(): number {
    if (!this.initialized) return 0;
    return (
      this.config.geminiKeys.length +
      this.config.groqKeys.length +
      this.config.openrouterKeys.length +
      this.config.githubKeys.length +
      this.config.cohereKeys.length +
      this.config.xaiKeys.length +
      this.config.fastrouterKeys.length +
      this.openaiKeys.length
    );
  }

  static markKeyAsFailed(key: string): void {
    this.failedKeys.add(key);
    // Don't log key details for security
  }

  static resetFailedKeys(): void {
    this.failedKeys.clear();
    // console.log('Reset all failed keys');
  }
}
