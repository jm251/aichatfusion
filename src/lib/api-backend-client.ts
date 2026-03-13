import { getBackendUrl } from './backend-url';

export class APIBackendClient {
  private static backendUrl = getBackendUrl();
  private static sessionToken: string | null = null;
  private static sessionExpiry: number = 0;
  private static keyCache = new Map<string, { key: string; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static serviceKeyCounts: Record<string, number> = {};
  private static openaiModelsCache: { models: string[]; timestamp: number } | null = null;
  private static fastRouterModelsCache: { models: string[]; timestamp: number } | null = null;
  private static OPENAI_MODELS_CACHE_DURATION = 5 * 60 * 1000;
  private static FASTROUTER_MODELS_CACHE_DURATION = 5 * 60 * 1000;
  private static MODEL_LIST_REQUEST_TIMEOUT = 8000;

  // Request deduplication - prevent multiple simultaneous requests for the same key
  private static pendingKeyRequests = new Map<string, Promise<string | null>>();
  private static pendingOpenAIModelsRequest: Promise<string[]> | null = null;
  private static pendingFastRouterModelsRequest: Promise<string[]> | null = null;
  private static initSessionPromise: Promise<void> | null = null;

  private static async fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs = APIBackendClient.MODEL_LIST_REQUEST_TIMEOUT,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if secure proxy mode is enabled
   * When true, AI calls go through backend proxy (keys never sent to client)
   * Set VITE_USE_PROXY=true in .env.local to enable
   */
  static isProxyMode(): boolean {
    return import.meta.env.VITE_USE_PROXY === 'true';
  }

  /**
   * Get the backend URL for proxy calls
   */
  static getBackendUrl(): string {
    return this.backendUrl;
  }

  /**
   * Get current session token (for proxy calls)
   */
  static getSessionToken(): string | null {
    return this.sessionToken || sessionStorage.getItem('api-session-token');
  }

  static async initSession(): Promise<void> {
    // Deduplicate concurrent init calls
    if (this.initSessionPromise) {
      return this.initSessionPromise;
    }

    this.initSessionPromise = this._doInitSession();
    try {
      await this.initSessionPromise;
    } finally {
      this.initSessionPromise = null;
    }
  }

  private static async _doInitSession(): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/api/session/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initialize session');
      }

      const data = await response.json();
      this.sessionToken = data.token;
      this.sessionExpiry = data.expiresAt;

      // Cache service counts from init response (avoids extra API call)
      if (data.services) {
        this.serviceKeyCounts = data.services;
        sessionStorage.setItem('api-service-counts', JSON.stringify(data.services));
      }

      // Store in sessionStorage for page refreshes
      sessionStorage.setItem('api-session-token', data.token);
      sessionStorage.setItem('api-session-expiry', String(data.expiresAt));
    } catch (error) {
      console.error('Failed to initialize backend session:', error);
      throw error;
    }
  }

  static async ensureSession(): Promise<void> {
    // Check if we have a valid session
    if (this.sessionToken && Date.now() < this.sessionExpiry - 60000) {
      return;
    }

    // Try to restore from sessionStorage
    const storedToken = sessionStorage.getItem('api-session-token');
    const storedExpiry = sessionStorage.getItem('api-session-expiry');

    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry) - 60000) {
      this.sessionToken = storedToken;
      this.sessionExpiry = parseInt(storedExpiry);
      return;
    }

    // Initialize new session
    await this.initSession();
  }

  static async getAPIKey(service: string): Promise<string | null> {
    // Check cache first (before any async operations)
    const cached = this.keyCache.get(service);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.key;
    }

    // Deduplicate concurrent requests for the same service
    const pendingRequest = this.pendingKeyRequests.get(service);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = this._fetchAPIKey(service);
    this.pendingKeyRequests.set(service, request);

    try {
      return await request;
    } finally {
      this.pendingKeyRequests.delete(service);
    }
  }

  private static async _fetchAPIKey(service: string): Promise<string | null> {
    try {
      await this.ensureSession();

      const response = await fetch(`${this.backendUrl}/api/keys/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': this.sessionToken!,
        },
        body: JSON.stringify({ service }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, try to reinitialize
          await this.initSession();
          // Retry once
          const retryResponse = await fetch(`${this.backendUrl}/api/keys/get`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-token': this.sessionToken!,
            },
            body: JSON.stringify({ service }),
          });

          if (!retryResponse.ok) {
            return null;
          }

          const retryData = await retryResponse.json();
          this.keyCache.set(service, { key: retryData.key, timestamp: Date.now() });
          return retryData.key;
        }
        return null;
      }

      const data = await response.json();

      // Cache the key
      this.keyCache.set(service, { key: data.key, timestamp: Date.now() });

      return data.key;
    } catch (error) {
      console.error(`Failed to get API key for ${service}:`, error);
      return null;
    }
  }

  static async rotateKey(service: string): Promise<void> {
    try {
      await this.ensureSession();

      // Clear cache for this service
      this.keyCache.delete(service);

      await fetch(`${this.backendUrl}/api/keys/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': this.sessionToken!,
        },
        body: JSON.stringify({ service }),
      });
    } catch (error) {
      console.error(`Failed to rotate key for ${service}:`, error);
    }
  }

  static async getServiceStatus(): Promise<Record<string, boolean>> {
    try {
      await this.ensureSession();

      const response = await fetch(`${this.backendUrl}/api/services/status`, {
        headers: {
          'x-session-token': this.sessionToken!,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get service status');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get service status:', error);
      return {
        groq: false,
        gemini: false,
        openai: false,
        openrouter: false,
        github: false,
        cohere: false,
        xai: false,
        fastrouter: false,
      };
    }
  }

  static async getKeyCount(service: string): Promise<number> {
    try {
      // First check cached counts
      if (this.serviceKeyCounts[service] !== undefined) {
        return this.serviceKeyCounts[service];
      }

      // Try to get from sessionStorage
      const stored = sessionStorage.getItem('api-service-counts');
      if (stored) {
        const counts = JSON.parse(stored);
        if (counts[service] !== undefined) {
          this.serviceKeyCounts = counts;
          return counts[service];
        }
      }

      // Fetch fresh counts from backend
      await this.ensureSession();

      const response = await fetch(`${this.backendUrl}/api/keys/count`, {
        headers: {
          'x-session-token': this.sessionToken!,
        },
      });

      if (response.ok) {
        const counts = await response.json();
        this.serviceKeyCounts = counts;
        sessionStorage.setItem('api-service-counts', JSON.stringify(counts));
        return counts[service] || 0;
      }

      return 0;
    } catch (error) {
      console.error(`Failed to get key count for ${service}:`, error);
      return 0;
    }
  }

  static async getAllKeyCounts(): Promise<Record<string, number>> {
    try {
      await this.ensureSession();

      const response = await fetch(`${this.backendUrl}/api/keys/count`, {
        headers: {
          'x-session-token': this.sessionToken!,
        },
      });

      if (response.ok) {
        const counts = await response.json();
        this.serviceKeyCounts = counts;
        sessionStorage.setItem('api-service-counts', JSON.stringify(counts));
        return counts;
      }

      return this.serviceKeyCounts;
    } catch (error) {
      console.error('Failed to get key counts:', error);
      return this.serviceKeyCounts;
    }
  }

  static async getOpenAIModels(forceRefresh = false): Promise<string[]> {
    if (this.pendingOpenAIModelsRequest) {
      return this.pendingOpenAIModelsRequest;
    }

    const request = this._getOpenAIModels(forceRefresh);
    this.pendingOpenAIModelsRequest = request;

    try {
      return await request;
    } finally {
      this.pendingOpenAIModelsRequest = null;
    }
  }

  private static async _getOpenAIModels(forceRefresh = false): Promise<string[]> {
    try {
      const now = Date.now();
      if (
        !forceRefresh &&
        this.openaiModelsCache &&
        now - this.openaiModelsCache.timestamp < this.OPENAI_MODELS_CACHE_DURATION
      ) {
        return this.openaiModelsCache.models;
      }

      await this.ensureSession();

      const response = await this.fetchWithTimeout(`${this.backendUrl}/api/models/openai`, {
        headers: {
          'x-session-token': this.sessionToken!,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const models = Array.isArray(data?.models)
        ? data.models.filter((model: unknown) => typeof model === 'string' && model.trim().length > 0)
        : [];

      this.openaiModelsCache = { models, timestamp: now };
      return models;
    } catch (error) {
      console.error('Failed to get OpenAI model list:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  static async getFastRouterModels(forceRefresh = false): Promise<string[]> {
    if (this.pendingFastRouterModelsRequest) {
      return this.pendingFastRouterModelsRequest;
    }

    const request = this._getFastRouterModels(forceRefresh);
    this.pendingFastRouterModelsRequest = request;

    try {
      return await request;
    } finally {
      this.pendingFastRouterModelsRequest = null;
    }
  }

  private static async _getFastRouterModels(forceRefresh = false): Promise<string[]> {
    try {
      const now = Date.now();
      if (
        !forceRefresh &&
        this.fastRouterModelsCache &&
        now - this.fastRouterModelsCache.timestamp < this.FASTROUTER_MODELS_CACHE_DURATION
      ) {
        return this.fastRouterModelsCache.models;
      }

      await this.ensureSession();

      const response = await this.fetchWithTimeout(`${this.backendUrl}/api/models/fastrouter`, {
        headers: {
          'x-session-token': this.sessionToken!,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const models = Array.isArray(data?.models)
        ? data.models.filter((model: unknown) => typeof model === 'string' && model.trim().length > 0)
        : [];

      this.fastRouterModelsCache = { models, timestamp: now };
      return models;
    } catch (error) {
      console.error('Failed to get FastRouter model list:', error instanceof Error ? error.message : error);
      return [];
    }
  }
}
