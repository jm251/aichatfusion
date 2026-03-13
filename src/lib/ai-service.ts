import {
  AIResponse,
  ResponseAnalysis,
  GitHubModel,
  ConsensusResponse,
  ConsensusAnalysis,
  AIService as AIServiceType,
} from "./types";
import { APIConfigManager } from "./api-config";
import { VectorStore } from "./vector-store";
import { AIProxyService, ProxyService, ProxyTarget } from "./ai-proxy-service";
import { APIBackendClient } from "./api-backend-client";

export class AIService {
  // UPDATED: include last latency; add baseline heuristic map
  private static serviceLatency: Record<
    string,
    { total: number; count: number; avg: number; last: number }
  > = {};
  private static baselineLatency: Record<string, number> = {
    groq: 600, // ultra-fast
    openai: 1000, // gpt-4o-mini is quite fast
    xai: 1050, // grok models - fast
    cohere: 1100, // conversational mid
    github: 1300, // mixed models
    openrouter: 1500, // varied routing
    fastrouter: 1600, // anthropic claude models via fastrouter
    gemini: 1800, // deeper reasoning (often slower cold)
  };
  private static updateLatency(service: string, ms: number | undefined) {
    if (ms == null) return;
    const stat = this.serviceLatency[service] || {
      total: 0,
      count: 0,
      avg: 0,
      last: ms,
    };
    stat.total += ms;
    stat.count += 1;
    stat.last = ms;
    stat.avg = stat.total / stat.count;
    this.serviceLatency[service] = stat;
  }

  private static readonly openRouterModelCacheTtlMs = 5 * 60 * 1000;
  private static readonly openRouterDefaultModels = [
    "qwen/qwen3-coder:free",
    "upstage/solar-pro-3:free",
    "openrouter/free",
  ];
  private static readonly openRouterPreferredModels = [
    "qwen/qwen3-coder:free",
    "openai/gpt-oss-20b:free",
    "openai/gpt-oss-120b:free",
    "upstage/solar-pro-3:free",
    "stepfun/step-3.5-flash:free",
  ];
  private static openRouterModelCache: { expiresAt: number; models: string[] } = {
    expiresAt: 0,
    models: [...AIService.openRouterDefaultModels],
  };

  private static compactText(value: unknown, max = 220): string {
    if (!value) return "";
    return String(value).replace(/\s+/g, " ").trim().slice(0, max);
  }

  private static parseProviderError(rawText: string, fallback: string): string {
    if (!rawText) return fallback;

    try {
      const parsed = JSON.parse(rawText);
      const message =
        parsed?.error?.message ||
        parsed?.message ||
        parsed?.detail ||
        parsed?.error_description;
      return this.compactText(message, 300) || fallback;
    } catch {
      return this.compactText(rawText, 300) || fallback;
    }
  }

  private static isPreferredOpenRouterModel(modelId: unknown): modelId is string {
    if (typeof modelId !== "string" || !modelId.endsWith(":free")) return false;

    const lower = modelId.toLowerCase();
    if (lower.includes("vl") || lower.includes("vision")) return false;
    if (lower.includes("image") || lower.includes("audio")) return false;
    if (lower.includes("transcribe") || lower.includes("embedding")) return false;
    if (lower.includes("thinking")) return false;
    return true;
  }

  private static invalidateOpenRouterModelCache(): void {
    this.openRouterModelCache.expiresAt = 0;
  }

  private static buildOpenRouterRequestModels(modelCandidates: string[]): string[] {
    const unique = Array.from(
      new Set((Array.isArray(modelCandidates) ? modelCandidates : []).filter(Boolean)),
    );
    const selected = unique.slice(0, 3);

    if (!selected.includes("openrouter/free")) {
      if (selected.length < 3) selected.push("openrouter/free");
      else selected[selected.length - 1] = "openrouter/free";
    }

    return Array.from(new Set(selected)).slice(0, 3);
  }

  private static async getOpenRouterModelCandidates(apiKey: string): Promise<string[]> {
    if (
      this.openRouterModelCache.expiresAt > Date.now() &&
      this.openRouterModelCache.models.length > 0
    ) {
      return this.openRouterModelCache.models;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/models/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const raw = await response.text();
        const details = this.parseProviderError(
          raw,
          `OpenRouter model list failed (${response.status})`,
        );
        throw new Error(details);
      }

      const data = await response.json();
      const available = Array.isArray(data?.data)
        ? data.data
            .map((item: any) => item?.id)
            .filter((id: unknown): id is string => this.isPreferredOpenRouterModel(id))
        : [];

      const ordered: string[] = [];
      for (const preferred of this.openRouterPreferredModels) {
        if (available.includes(preferred)) ordered.push(preferred);
      }
      for (const model of available) {
        if (!ordered.includes(model)) ordered.push(model);
      }

      const selected = ordered.slice(0, 10);
      if (!selected.includes("openrouter/free")) selected.push("openrouter/free");
      if (selected.length === 0) selected.push(...this.openRouterDefaultModels);

      this.openRouterModelCache = {
        expiresAt: Date.now() + this.openRouterModelCacheTtlMs,
        models: selected,
      };
      return selected;
    } catch (error) {
      console.warn(
        "[OpenRouter] Falling back to default model list:",
        error instanceof Error ? error.message : String(error),
      );
      this.openRouterModelCache = {
        expiresAt: Date.now() + this.openRouterModelCacheTtlMs,
        models: [...this.openRouterDefaultModels],
      };
      return this.openRouterModelCache.models;
    }
  }

  private static extractOpenRouterContent(data: any): string {
    const firstMessage = data?.choices?.[0]?.message;
    const content = firstMessage?.content;

    if (typeof content === "string" && content.trim()) return content.trim();

    if (Array.isArray(content)) {
      const joined = content
        .map((part) =>
          typeof part === "string"
            ? part
            : typeof part?.text === "string"
              ? part.text
              : "",
        )
        .join("")
        .trim();
      if (joined) return joined;
    }

    if (
      typeof firstMessage?.reasoning === "string" &&
      firstMessage.reasoning.trim()
    ) {
      return firstMessage.reasoning.trim();
    }

    return "";
  }

  // Strategy 1: Sequential Fallback (Speed Priority)
  private static async callGroqAPI(
    message: string,
    timeout = 10000,
    externalController?: AbortController
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;
    const controller = externalController || new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      keyUsed = await APIConfigManager.getNextGroqKey();

      if (!keyUsed) {
        return {
          content: "",
          source: "groq",
          success: false,
          error: "No Groq API keys available",
          responseTime: Date.now() - startTime,
        };
      }

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keyUsed}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content:
                  "You are Groq AI, an ultra-fast AI assistant optimized for real-time interactions. Provide concise, helpful responses quickly.",
              },
              {
                role: "user",
                content: message,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
            stream: false,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `Groq API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage += ` - ${errorData}`;
        }

        if (response.status === 429 || response.status === 401) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          APIConfigManager.rotateKey("groq"); // NEW: rotate only on failure
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from Groq API");
      }

      const result: AIResponse = {
        content: data.choices[0].message.content,
        source: "groq",
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: "llama-3.1-8b-instant",
      };
      AIService.updateLatency("groq", result.responseTime);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      const fail: AIResponse = {
        content: "",
        source: "groq",
        success: false,
        error: "Service temporarily unavailable", // Generic error message
        responseTime: Date.now() - startTime,
      };
      AIService.updateLatency("groq", fail.responseTime);
      return fail;
    }
  }

  // Gemini API implementation via FastRouter
  private static async callGeminiAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;
    const maxAttempts = await APIConfigManager.getKeyCount("fastrouter");
    const tried = new Set<string>();

    if (maxAttempts === 0) {
      return {
        content: "",
        source: "gemini",
        success: false,
        error: "No FastRouter API keys available for Gemini",
        responseTime: Date.now() - startTime,
      };
    }

    // Try all available keys for 429 errors
    while (tried.size < maxAttempts) {
      try {
        // Use FastRouter API key for Gemini models
        keyUsed = await APIConfigManager.getNextFastRouterKey();

        if (!keyUsed) {
          break;
        }

        tried.add(keyUsed);

        const response = await fetch(
          "https://go.fastrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${keyUsed}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: "You are Gemini, a helpful AI assistant by Google. Provide clear, accurate, and comprehensive responses.",
                },
                {
                  role: "user",
                  content: message,
                },
              ],
              max_tokens: 4096,
              temperature: 0.7,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("Invalid response format from Gemini API");
          }

          const result: AIResponse = {
            content: data.choices[0].message.content,
            source: "gemini",
            success: true,
            keyUsed,
            responseTime: Date.now() - startTime,
            model: data.model || "google/gemini-2.5-flash",
          };
          AIService.updateLatency("gemini", result.responseTime);
          return result;
        }

        // Check for 429 (rate limit) errors
        if (response.status === 429) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          await APIConfigManager.rotateKey("fastrouter");

          // If this was the last attempt, return specific 429 error
          if (tried.size >= maxAttempts) {
            return {
              content:
                "The Gemini model is currently experiencing high traffic. Please try again later.",
              source: "gemini",
              success: false,
              error: "Rate limit exceeded on all available FastRouter API keys",
              responseTime: Date.now() - startTime,
              isRateLimited: true,
            };
          }

          // Continue to next key
          continue;
        }

        // Handle other API errors (403, 401, etc.)
        if (response.status === 403 || response.status === 401) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          await APIConfigManager.rotateKey("fastrouter");
          continue;
        }

        // For other errors, throw immediately
        throw new Error("Service temporarily unavailable");
      } catch (error) {
        // If this isn't a rate limit retry scenario, return the error
        if (
          tried.size >= maxAttempts ||
          !(error instanceof Error) ||
          (!error.message.includes("429") &&
            !error.message.includes("rate limit"))
        ) {
          return {
            content: "",
            source: "gemini",
            success: false,
            error: "Service temporarily unavailable",
            responseTime: Date.now() - startTime,
          };
        }
      }
    }

    // All keys exhausted
    return {
      content: "",
      source: "gemini",
      success: false,
      error: "Service temporarily unavailable",
      responseTime: Date.now() - startTime,
      isRateLimited: true,
    };
  }

  // OpenRouter API implementation
  private static async callOpenRouterAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    await APIConfigManager.initialize();
    const maxAttempts = Math.max(1, APIConfigManager.getKeyCount("openrouter"));
    const attemptErrors: string[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let keyUsed: string | null = null;
      try {
        keyUsed = await APIConfigManager.getNextOpenRouterKey();
        if (!keyUsed) break;

        const modelCandidates = await this.getOpenRouterModelCandidates(keyUsed);
        const requestModels = this.buildOpenRouterRequestModels(modelCandidates);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keyUsed}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              typeof window !== "undefined"
                ? window.location.origin
                : "http://localhost:5173",
            "X-Title": "AI Chat Fusion",
          },
          body: JSON.stringify({
            models: requestModels,
            provider: {
              allow_fallbacks: true,
              sort: "throughput",
            },
            messages: [
              {
                role: "system",
                content:
                  "You are OpenRouter AI, a flexible and powerful AI assistant with access to multiple state-of-the-art language models. Provide helpful, accurate responses to user queries.",
              },
              { role: "user", content: message },
            ],
            max_tokens: 1000,
            temperature: 0.5,
            stream: false,
          }),
        });

        const raw = await response.text();

        if (!response.ok) {
          const details = this.parseProviderError(
            raw,
            `OpenRouter API error (${response.status})`,
          );
          attemptErrors.push(`${response.status}: ${details}`);

          if (response.status === 400 || response.status === 404) {
            this.invalidateOpenRouterModelCache();
          }

          if (keyUsed && (response.status === 401 || response.status === 429)) {
            APIConfigManager.markKeyAsFailed(keyUsed);
          }

          await APIConfigManager.rotateKey("openrouter");
          continue;
        }

        const data = JSON.parse(raw);
        const content = this.extractOpenRouterContent(data);
        if (!content) {
          attemptErrors.push("OpenRouter returned empty content");
          await APIConfigManager.rotateKey("openrouter");
          continue;
        }

        const result: AIResponse = {
          content,
          source: "openrouter",
          success: true,
          keyUsed,
          responseTime: Date.now() - startTime,
          model: data?.model || "openrouter/free",
        };
        AIService.updateLatency("openrouter", result.responseTime);
        return result;
      } catch (error) {
        const details =
          error instanceof Error ? error.message : "Unknown OpenRouter error";
        attemptErrors.push(`network: ${this.compactText(details)}`);
        if (keyUsed) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          await APIConfigManager.rotateKey("openrouter");
        }
      }
    }

    return {
      content: "",
      source: "openrouter",
      success: false,
      error:
        attemptErrors.length > 0
          ? `All OpenRouter attempts failed: ${attemptErrors.join(" | ")}`
          : "All OpenRouter models unavailable",
      responseTime: Date.now() - startTime,
    };
  }

  // GitHub Models API implementation
  private static async callGitHubAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      keyUsed = await APIConfigManager.getNextGitHubKey();

      if (!keyUsed) {
        return {
          content: "",
          source: "github",
          success: false,
          error: "No GitHub API tokens available",
          responseTime: Date.now() - startTime,
        };
      }

      // Rotate through available models
      const githubModels: GitHubModel[] = [
        "xai/grok-3-mini",
        "xai/grok-3",
        "meta/Llama-4-Scout-17B-16E-Instruct",
        "mistral-ai/Codestral-2501",
        "deepseek/DeepSeek-V3-0324",
        "openai/gpt-4.1",
      ];

      // Get current timestamp modulo the number of models to rotate through models
      const modelIndex = Math.floor(Date.now() / 1000) % githubModels.length;
      const selectedModel = githubModels[modelIndex];

      const response = await fetch(
        "https://models.github.ai/inference/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keyUsed}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content:
                  "You are GitHub AI, an advanced AI assistant powered by cutting-edge models including DeepSeek, Grok, Llama, Mistral, Microsoft, and OpenAI. Provide insightful, detailed responses to user queries.",
              },
              {
                role: "user",
                content: message,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 1.0,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `GitHub API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage += ` - ${errorData}`;
        }

        if (response.status === 429 || response.status === 401) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          APIConfigManager.rotateKey("github"); // NEW
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from GitHub API");
      }

      const result: AIResponse = {
        content: data.choices[0].message.content,
        source: "github",
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: selectedModel,
      };
      AIService.updateLatency("github", result.responseTime);
      return result;
    } catch (error) {
      if (
        keyUsed &&
        error instanceof Error &&
        (error.message.includes("429") || error.message.includes("401"))
      ) {
        APIConfigManager.markKeyAsFailed(keyUsed);
        APIConfigManager.rotateKey("github"); // NEW
      }

      return {
        content: "",
        source: "github",
        success: false,
        error: "Service temporarily unavailable", // Generic error message
        responseTime: Date.now() - startTime,
      };
    }
  }

  // Cohere API implementation
  private static async callCohereAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    await APIConfigManager.initialize();
    const maxAttempts = Math.max(1, APIConfigManager.getKeyCount("cohere"));
    const modelCandidates = [
      "command-a-03-2025",
      "command-r-plus-08-2024",
      "command-r7b-12-2024",
    ];
    const attemptErrors: string[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let keyUsed: string | null = null;
      try {
        keyUsed = await APIConfigManager.getNextCohereKey();
        if (!keyUsed) break;

        let shouldRotateKey = false;

        for (const model of modelCandidates) {
          const response = await fetch("https://api.cohere.com/v2/chat", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${keyUsed}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: message }],
              temperature: 0.7,
            }),
          });

          const raw = await response.text();

          if (response.ok) {
            const data = JSON.parse(raw);
            const content = data?.message?.content?.[0]?.text || "";
            if (!content.trim()) {
              attemptErrors.push(`${model}: empty response`);
              continue;
            }

            const result: AIResponse = {
              content,
              source: "cohere",
              success: true,
              keyUsed,
              responseTime: Date.now() - startTime,
              model,
            };
            AIService.updateLatency("cohere", result.responseTime);
            return result;
          }

          const details = this.parseProviderError(
            raw,
            `Cohere API error (${response.status})`,
          );
          attemptErrors.push(`${model} (${response.status}): ${details}`);

          if (response.status === 401 || response.status === 429) {
            shouldRotateKey = true;
            break;
          }

          if (
            response.status === 404 ||
            (response.status === 400 && /model|removed|not found|deprecated/i.test(details))
          ) {
            continue;
          }
        }

        if (keyUsed && shouldRotateKey) {
          APIConfigManager.markKeyAsFailed(keyUsed);
        }
        await APIConfigManager.rotateKey("cohere");
      } catch (error) {
        const details =
          error instanceof Error ? error.message : "Unknown Cohere error";
        attemptErrors.push(this.compactText(details));
        if (keyUsed) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          await APIConfigManager.rotateKey("cohere");
        }
      }
    }

    return {
      content: "",
      source: "cohere",
      success: false,
      error:
        attemptErrors.length > 0
          ? `All Cohere attempts failed: ${attemptErrors.join(" | ")}`
          : "Service temporarily unavailable",
      responseTime: Date.now() - startTime,
    };
  }

  // FastRouter API implementation for Anthropic Claude models
  private static async callFastRouterAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      keyUsed = await APIConfigManager.getNextFastRouterKey();

      if (!keyUsed) {
        return {
          content: "",
          source: "fastrouter",
          success: false,
          error: "No FastRouter API keys available",
          responseTime: Date.now() - startTime,
        };
      }

      // FastRouter Anthropic models - rotate through available models
      const fastrouterModels = [
        "anthropic/claude-3-7-sonnet-20250219",  // Claude 3.7 Sonnet (latest)
        "anthropic/claude-sonnet-4-20250514",     // Claude Sonnet 4
        "anthropic/claude-opus-4.5",              // Claude Opus 4.5 (most capable)
      ];

      const modelIndex = Math.floor(Date.now() / 1000) % fastrouterModels.length;
      const selectedModel = fastrouterModels[modelIndex];

      const response = await fetch("https://go.fastrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyUsed}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. Provide thoughtful, nuanced responses to user queries.",
            },
            {
              role: "user",
              content: message,
            },
          ],
          max_tokens: 2048,
          temperature: 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `FastRouter API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
        } catch {
          errorMessage += ` - ${errorData}`;
        }

        if (response.status === 429 || response.status === 401) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          APIConfigManager.rotateKey("fastrouter");
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from FastRouter API");
      }

      const result: AIResponse = {
        content: data.choices[0].message.content,
        source: "fastrouter",
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: selectedModel,
      };
      AIService.updateLatency("fastrouter", result.responseTime);
      return result;
    } catch (error) {
      if (
        keyUsed &&
        error instanceof Error &&
        (error.message.includes("429") || error.message.includes("401"))
      ) {
        APIConfigManager.markKeyAsFailed(keyUsed);
        APIConfigManager.rotateKey("fastrouter");
      }

      return {
        content: "",
        source: "fastrouter",
        success: false,
        error: "Service temporarily unavailable",
        responseTime: Date.now() - startTime,
      };
    }
  }

  // Fast Sequential Fallback Strategy
  private static async getSequentialResponse(
    message: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    const groqResponse = await this.callGroqAPI(message, 3000);
    if (groqResponse.success) return groqResponse;

    const geminiResponse = await this.callGeminiAPI(message);
    if (geminiResponse.success) return geminiResponse;

    const openaiResponse = await this.callOpenAIAPI(message);
    if (openaiResponse.success) return openaiResponse;

    const cohereResponse = await this.callCohereAPI(message);
    if (cohereResponse.success) return cohereResponse;

    const xaiResponse = await this.callXAIAPI(message);
    if (xaiResponse.success) return xaiResponse;

    const githubResponse = await this.callGitHubAPI(message);
    if (githubResponse.success) return githubResponse;

    const openRouterResponse = await this.callOpenRouterAPI(message);
    if (openRouterResponse.success) return openRouterResponse;

    const fastRouterResponse = await this.callFastRouterAPI(message);
    if (fastRouterResponse.success) return fastRouterResponse;

    return {
      content:
        "I apologize, but all AI services are currently unavailable. Please configure at least one API key in the settings to use this application.",
      source: "system",
      success: false,
      error: "No AI services configured or all services failed",
      responseTime: Date.now() - startTime,
    };
  }

  // Enhanced parallel responses with individual service loading - updated: final list sorted by fastest response
  private static async getParallelResponses(
    message: string,
    onServiceUpdate?: (
      service: string,
      status: "loading" | "success" | "error",
      response?: AIResponse
    ) => void,
    selectedServices?: AIServiceType[]
  ): Promise<AIResponse[]> {
    await APIConfigManager.initialize();
    const serviceStatus = await APIConfigManager.getServiceStatus();

    const shouldUseService = (service: AIServiceType) => {
      if (selectedServices && selectedServices.length > 0) {
        return (
          selectedServices.includes(service) &&
          serviceStatus[service as keyof typeof serviceStatus]
        );
      }
      return serviceStatus[service as keyof typeof serviceStatus];
    };

    // Collect callable service factories first
    const factories: Array<{ name: string; fn: () => Promise<AIResponse> }> =
      [];
    if (shouldUseService("groq"))
      factories.push({ name: "groq", fn: () => this.callGroqAPI(message) });
    if (shouldUseService("openai"))
      factories.push({ name: "openai", fn: () => this.callOpenAIAPI(message) });
    if (shouldUseService("gemini"))
      factories.push({ name: "gemini", fn: () => this.callGeminiAPI(message) });
    if (shouldUseService("cohere"))
      factories.push({ name: "cohere", fn: () => this.callCohereAPI(message) });
    if (shouldUseService("xai"))
      factories.push({ name: "xai", fn: () => this.callXAIAPI(message) });
    if (shouldUseService("github"))
      factories.push({ name: "github", fn: () => this.callGitHubAPI(message) });
    if (shouldUseService("openrouter"))
      factories.push({
        name: "openrouter",
        fn: () => this.callOpenRouterAPI(message),
      });
    if (shouldUseService("fastrouter"))
      factories.push({
        name: "fastrouter",
        fn: () => this.callFastRouterAPI(message),
      });

    // REPLACED SORT: use effective latency (observed avg or baseline) + dynamic penalty
    const effectiveLatency: Record<string, number> = {};
    factories.forEach((f) => {
      const stat = AIService.serviceLatency[f.name];
      effectiveLatency[f.name] =
        stat?.avg ?? AIService.baselineLatency[f.name] ?? 1400;
    });
    const fastest = Math.min(...Object.values(effectiveLatency));
    factories.sort((a, b) => {
      const effA =
        effectiveLatency[a.name] *
        (effectiveLatency[a.name] > fastest * 3 ? 2.5 : 1);
      const effB =
        effectiveLatency[b.name] *
        (effectiveLatency[b.name] > fastest * 3 ? 2.5 : 1);
      if (effA === effB) {
        // tie-breaker: fallback to baseline to keep deterministic order
        const baseA = AIService.baselineLatency[a.name] ?? 1500;
        const baseB = AIService.baselineLatency[b.name] ?? 1500;
        return baseA - baseB;
      }
      return effA - effB;
    });

    // OPTIONAL: increased stagger only for slower half to prioritize early UI token
    const midpoint = Math.ceil(factories.length / 2);

    const responses: AIResponse[] = [];
    factories.forEach(({ name }) => onServiceUpdate?.(name, "loading"));

    await Promise.allSettled(
      factories.map(async ({ name, fn }, idx) => {
        if (idx >= midpoint) {
          // slower group slight delay (40ms * position in slower half)
          await new Promise((r) => setTimeout(r, 40 * (idx - midpoint + 1)));
        }
        try {
          const res = await fn();
          responses.push(res);
          onServiceUpdate?.(name, res.success ? "success" : "error", res);
        } catch (e) {
          const errResp: AIResponse = {
            content: "",
            source: name as any,
            success: false,
            error: e instanceof Error ? e.message : "Unknown error",
            responseTime: 0,
          };
          responses.push(errResp);
          onServiceUpdate?.(name, "error", errResp);
        }
      })
    );

    // Existing final sort (success first + fastest)
    responses.sort((a, b) => {
      if (a.success !== b.success) return a.success ? -1 : 1;
      return (a.responseTime ?? 1e9) - (b.responseTime ?? 1e9);
    });

    return responses;
  }

  // Intelligent Response Analysis
  private static async analyzeResponses(
    responses: AIResponse[]
  ): Promise<ResponseAnalysis> {
    if (responses.length === 0) {
      throw new Error("No responses to analyze");
    }

    if (responses.length === 1) {
      return {
        bestResponse: responses[0],
        confidence: responses[0].success ? 0.8 : 0.3,
        reasoning: `Single response from ${responses[0].source}`,
        commonThemes: [],
      };
    }

    // Use AI to analyze and judge the responses
    try {
      const responseTexts = responses
        .map(
          (r, i) =>
            `Response ${i + 1} (${r.source}${r.model ? ` - ${r.model}` : ""
            }): ${r.content}`
        )
        .join("\n\n");

      // If spark is not available, just return the first successful response
      if (typeof spark === "undefined" || !spark.llm) {
        const successResponses = responses.filter((r) => r.success);
        return {
          bestResponse:
            successResponses.length > 0 ? successResponses[0] : responses[0],
          confidence: 0.7,
          reasoning:
            "Selected first available response (spark analysis not available)",
          commonThemes: [],
        };
      }

      const analysisPrompt = spark.llmPrompt`Analyze these AI responses and determine which is the best. Consider accuracy, completeness, clarity, and relevance. Return your analysis in this exact JSON format:

{
  "bestResponseIndex": 0,
  "confidence": 0.9,
  "reasoning": "Brief explanation of why this response is best",
  "commonThemes": ["theme1", "theme2"]
}

Responses to analyze:
${responseTexts}`;

      const analysisResult = await spark.llm(
        analysisPrompt,
        "gpt-4o-mini",
        true
      );
      const analysis = JSON.parse(analysisResult);

      const bestIndex = Math.min(
        analysis.bestResponseIndex,
        responses.length - 1
      );

      return {
        bestResponse: responses[bestIndex],
        confidence: Math.min(Math.max(analysis.confidence, 0), 1),
        reasoning:
          analysis.reasoning ||
          `Selected ${responses[bestIndex].source} response`,
        commonThemes: Array.isArray(analysis.commonThemes)
          ? analysis.commonThemes
          : [],
      };
    } catch (error) {
      // Fallback: select based on simple heuristics
      const successfulResponses = responses.filter((r) => r.success);

      if (successfulResponses.length === 0) {
        return {
          bestResponse: responses[0],
          confidence: 0.3,
          reasoning: "No successful responses available",
          commonThemes: [],
        };
      }

      // Prefer faster, successful responses
      const sortedBySpeed = successfulResponses.sort(
        (a, b) => (a.responseTime || 9999) - (b.responseTime || 9999)
      );

      return {
        bestResponse: sortedBySpeed[0],
        confidence: 0.7,
        reasoning: `Selected fastest successful response from ${sortedBySpeed[0].source}`,
        commonThemes: [],
      };
    }
  }

  // Add method to augment message with context
  private static async augmentMessageWithContext(
    message: string,
    userId?: string
  ): Promise<string> {
    if (!userId) return message;

    try {
      // Search for relevant chunks
      const relevantChunks = await VectorStore.searchRelevantChunks(
        userId,
        message
      );

      if (relevantChunks.length === 0) {
        return message;
      }

      // Build context from chunks
      const context = VectorStore.buildContext(relevantChunks);

      // Prepend context to message
      return `${context}User Question: ${message}`;
    } catch (error) {
      console.error("Error augmenting message with context:", error);
      return message; // Fallback to original message
    }
  }

  // Main public method - determines strategy based on user preference
  static async getAIResponses(
    message: string,
    strategy: "fast" | "comprehensive" = "comprehensive",
    onServiceUpdate?: (
      service: string,
      status: "loading" | "success" | "error",
      response?: AIResponse
    ) => void,
    selectedServices?: AIServiceType[],
    userId?: string // Add userId parameter
  ): Promise<AIResponse[]> {
    try {
      // Augment message with knowledge base context
      const augmentedMessage = await this.augmentMessageWithContext(
        message,
        userId
      );

      // Use secure proxy mode if enabled (keys never leave server)
      if (APIBackendClient.isProxyMode()) {
        return this.getProxyResponses(augmentedMessage, strategy, onServiceUpdate, selectedServices);
      }

      if (strategy === "fast") {
        // Use augmented message for sequential fallback
        const response = await this.getSequentialResponse(augmentedMessage);

        if (onServiceUpdate && response.source !== "system") {
          onServiceUpdate(
            response.source,
            response.success ? "success" : "error",
            response
          );
        }

        return [response];
      } else {
        // Use augmented message for parallel responses
        const responses = await this.getParallelResponses(
          augmentedMessage,
          onServiceUpdate,
          selectedServices
        );

        if (responses.length === 0) {
          return [
            {
              content:
                "I apologize, but no AI services are available. Please configure at least one API key in the settings to use this application.",
              source: "system",
              success: false,
              error: "No AI services configured",
            },
          ];
        }

        return responses;
      }
    } catch (error) {
      return [
        {
          content:
            "An unexpected error occurred while processing your request. Please check your API key configuration in the settings.",
          source: "system",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      ];
    }
  }

  // Secure proxy mode - AI calls go through backend (keys never sent to client)
  private static async getProxyResponses(
    message: string,
    strategy: "fast" | "comprehensive",
    onServiceUpdate?: (
      service: string,
      status: "loading" | "success" | "error",
      response?: AIResponse
    ) => void,
    selectedServices?: AIServiceType[]
  ): Promise<AIResponse[]> {
    if (strategy === "fast") {
      const response = await AIProxyService.getFastResponse(message);
      if (onServiceUpdate && response.source !== "system") {
        onServiceUpdate(response.source, response.success ? "success" : "error", response);
      }
      return [response];
    }

    // Comprehensive mode - parallel proxy calls
    const validProxyServices = ['groq', 'gemini', 'cohere', 'github', 'openrouter', 'xai', 'fastrouter', 'openai'];
    const proxyServices: ProxyService[] = selectedServices?.length
      ? (selectedServices.filter(s => validProxyServices.includes(s as string)) as ProxyService[])
      : ['groq', 'gemini', 'cohere', 'github', 'openrouter', 'fastrouter', 'openai'];
    const proxyTargets = AIProxyService.buildTargetsFromServices(proxyServices);

    const responses = await AIProxyService.getComprehensiveResponses(
      message,
      proxyTargets,
      (targetId, response) => {
        if (onServiceUpdate) {
          onServiceUpdate(targetId, response.success ? "success" : "error", response);
        }
      }
    );

    if (responses.length === 0) {
      return [{
        content: "I apologize, but no AI services are available. Please try again later.",
        source: "system",
        success: false,
        error: "No AI services responded",
      }];
    }

    return responses;
  }

  static getProxyLoadingTargets(selectedServices?: AIServiceType[]): Array<{
    id: string;
    service: AIServiceType;
    model?: string;
  }> {
    const validProxyServices = [
      "groq",
      "gemini",
      "cohere",
      "github",
      "openrouter",
      "xai",
      "fastrouter",
      "openai",
    ];

    const proxyServices: ProxyService[] = selectedServices?.length
      ? (selectedServices.filter((s) =>
        validProxyServices.includes(s as string),
      ) as ProxyService[])
      : ["groq", "gemini", "cohere", "github", "openrouter", "fastrouter", "openai"];

    const targets: ProxyTarget[] = AIProxyService.buildTargetsFromServices(proxyServices);
    return targets.map((target) => ({
      id: target.id,
      service: target.service as AIServiceType,
      model: target.model,
    }));
  }

  // Get best response from multiple responses
  static async getBestResponse(
    message: string,
    onServiceUpdate?: (
      service: string,
      status: "loading" | "success" | "error",
      response?: AIResponse
    ) => void,
    selectedServices?: AIServiceType[]
  ): Promise<AIResponse> {
    const responses = await this.getParallelResponses(
      message,
      onServiceUpdate,
      selectedServices
    );
    const analysis = await this.analyzeResponses(responses);
    return analysis.bestResponse;
  }

  // Get service status
  static async getConfiguredServices(): Promise<{
    groq: boolean;
    gemini: boolean;
    openai: boolean;
    openrouter: boolean;
    github: boolean;
    cohere: boolean;
    xai: boolean;
    fastrouter: boolean;
  }> {
    await APIConfigManager.initialize();
    const serviceStatus = await APIConfigManager.getServiceStatus();
    return {
      groq: serviceStatus.groq,
      gemini: serviceStatus.gemini,
      openai: serviceStatus.openai,
      openrouter: serviceStatus.openrouter,
      github: serviceStatus.github,
      cohere: serviceStatus.cohere,
      xai: serviceStatus.xai,
      fastrouter: serviceStatus.fastrouter,
    };
  }

  // Generate consensus response from multiple models
  static async generateConsensusResponse(
    message: string,
    onServiceUpdate?: (
      service: string,
      status: "loading" | "success" | "error",
      response?: AIResponse
    ) => void,
    selectedServices?: AIServiceType[],
    userId?: string
  ): Promise<ConsensusResponse> {
    const startTime = Date.now();

    try {
      // Get responses from all selected services (or all available if none selected)
      const responses = await this.getParallelResponses(
        await this.augmentMessageWithContext(message, userId),
        onServiceUpdate,
        selectedServices
      );

      // Filter successful responses
      const successfulResponses = responses.filter(
        (r) => r.success && r.content
      );

      if (successfulResponses.length === 0) {
        return {
          content:
            "Unable to generate consensus - no successful responses from AI models.",
          source: "consensus",
          success: false,
          error: "No successful responses",
          responseTime: Date.now() - startTime,
          confidence: 0,
          contributingModels: [],
          commonThemes: [],
          modelResponses: responses,
        };
      }

      // Analyze responses for consensus
      const consensusAnalysis = await this.analyzeConsensus(
        successfulResponses,
        message
      );

      return {
        content: consensusAnalysis.unifiedResponse,
        source: "consensus",
        success: true,
        responseTime: Date.now() - startTime,
        confidence: consensusAnalysis.confidence,
        contributingModels: successfulResponses.map((r) => r.source),
        commonThemes: consensusAnalysis.commonThemes,
        modelResponses: responses,
      };
    } catch (error) {
      return {
        content: "Failed to generate consensus response.",
        source: "consensus",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
        confidence: 0,
        contributingModels: [],
        commonThemes: [],
        modelResponses: [],
      };
    }
  }

  // Analyze multiple responses to generate consensus
  private static async analyzeConsensus(
    responses: AIResponse[],
    originalQuestion: string
  ): Promise<ConsensusAnalysis> {
    if (responses.length === 1) {
      return {
        unifiedResponse: responses[0].content,
        confidence: 0.7,
        commonThemes: [],
        keyAgreements: [],
        keyDisagreements: [],
        semanticSimilarity: 1.0,
      };
    }

    // Prepare response texts for analysis
    const responseTexts = responses
      .map(
        (r, i) =>
          `Model ${i + 1} (${r.source}${r.model ? ` - ${r.model}` : ""}): ${r.content
          }`
      )
      .join("\n\n---\n\n");

    // Try to use Gemini for consensus analysis (it's good at synthesis)
    try {
      const geminiKey = await APIConfigManager.getNextGeminiKey();
      if (geminiKey) {
        const analysisPrompt = `You are an expert at analyzing and synthesizing multiple AI responses. 
Your task is to create a unified consensus response that captures the best insights from all models while noting agreements and disagreements.

Original Question: ${originalQuestion}

AI Model Responses:
${responseTexts}

Please analyze these responses and provide a JSON response with the following structure:
{
  "unifiedResponse": "A comprehensive, well-structured answer that synthesizes the best elements from all responses",
  "confidence": 0.85,
  "commonThemes": ["theme1", "theme2"],
  "keyAgreements": ["point1", "point2"],
  "keyDisagreements": ["disagreement1", "disagreement2"],
  "semanticSimilarity": 0.75
}

Rules:
1. The unified response should be comprehensive but concise
2. Confidence should be 0-1 based on how much the models agree
3. Semantic similarity should reflect how similar the core messages are (0-1)
4. Extract 3-5 common themes
5. List the main points of agreement and disagreement
6. The unified response should be better than any individual response`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: analysisPrompt }],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const responseText = data.candidates[0].content.parts[0].text;
            // Extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0]);
              return {
                unifiedResponse:
                  analysis.unifiedResponse || this.simpleConsensus(responses),
                confidence: Math.min(
                  Math.max(analysis.confidence || 0.7, 0),
                  1
                ),
                commonThemes: Array.isArray(analysis.commonThemes)
                  ? analysis.commonThemes
                  : [],
                keyAgreements: Array.isArray(analysis.keyAgreements)
                  ? analysis.keyAgreements
                  : [],
                keyDisagreements: Array.isArray(analysis.keyDisagreements)
                  ? analysis.keyDisagreements
                  : [],
                semanticSimilarity: Math.min(
                  Math.max(analysis.semanticSimilarity || 0.7, 0),
                  1
                ),
              };
            }
          }
        }
      }
    } catch (error) {
      console.error("Consensus analysis with Gemini failed:", error);
    }

    // Fallback: Simple consensus based on common patterns
    return this.simpleConsensusAnalysis(responses);
  }

  // Simple fallback consensus when AI analysis fails
  private static simpleConsensusAnalysis(
    responses: AIResponse[]
  ): ConsensusAnalysis {
    // Calculate basic similarity by checking common words/phrases
    const allWords = responses.flatMap((r) =>
      r.content
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const wordFreq = new Map<string, number>();
    allWords.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Find common themes (words that appear in most responses)
    const commonWords = Array.from(wordFreq.entries())
      .filter(([_, count]) => count >= responses.length * 0.6)
      .map(([word]) => word)
      .slice(0, 5);

    // Calculate simple confidence based on response similarity
    const avgResponseLength =
      responses.reduce((sum, r) => sum + r.content.length, 0) /
      responses.length;
    const lengthVariance =
      responses.reduce(
        (sum, r) => sum + Math.abs(r.content.length - avgResponseLength),
        0
      ) / responses.length;
    const confidence = Math.max(
      0.5,
      Math.min(0.9, 1 - lengthVariance / avgResponseLength)
    );

    // Create unified response
    const unifiedResponse = this.simpleConsensus(responses);

    return {
      unifiedResponse,
      confidence,
      commonThemes: commonWords,
      keyAgreements: [`All models provided responses about the topic`],
      keyDisagreements:
        lengthVariance > avgResponseLength * 0.3
          ? [`Response lengths vary significantly`]
          : [],
      semanticSimilarity: confidence,
    };
  }

  // Simple consensus: combine unique insights from each response
  private static simpleConsensus(responses: AIResponse[]): string {
    const intro = `Based on responses from ${responses.length
      } AI models (${responses
        .map((r) => r.source)
        .join(", ")}), here's a synthesized answer:\n\n`;

    // Get the longest response as base
    const baseResponse = responses.reduce((longest, current) =>
      current.content.length > longest.content.length ? current : longest
    );

    // Add unique insights from other responses
    const additionalInsights: string[] = [];
    responses.forEach((r) => {
      if (r.source !== baseResponse.source && r.content.length > 100) {
        // Extract first unique sentence that's not in base response
        const sentences = r.content
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 20);
        const uniqueSentence = sentences.find(
          (s) =>
            !baseResponse.content.toLowerCase().includes(s.toLowerCase().trim())
        );
        if (uniqueSentence) {
          additionalInsights.push(
            `${r.source} adds: ${uniqueSentence.trim()}.`
          );
        }
      }
    });

    let consensus = intro + baseResponse.content;
    if (additionalInsights.length > 0) {
      consensus +=
        "\n\nAdditional perspectives:\n" + additionalInsights.join("\n");
    }

    return consensus;
  }

  // xAI (Grok) API implementation via FastRouter
  private static async callXAIAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      // Use FastRouter API key for xAI/Grok models
      keyUsed = await APIConfigManager.getNextFastRouterKey();

      if (!keyUsed) {
        return {
          content: "",
          source: "xai",
          success: false,
          error: "No FastRouter API keys available for xAI",
          responseTime: Date.now() - startTime,
        };
      }

      const response = await fetch("https://go.fastrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyUsed}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "x-ai/grok-3-beta",
          messages: [
            {
              role: "system",
              content:
                "You are Grok, an AI assistant created by xAI. You are witty, curious, and helpful. Provide insightful responses with a touch of humor when appropriate.",
            },
            {
              role: "user",
              content: message,
            },
          ],
          max_tokens: 2048,
          temperature: 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `xAI API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage += ` - ${errorData}`;
        }

        if (response.status === 429 || response.status === 401) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          APIConfigManager.rotateKey("fastrouter");
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from xAI API");
      }

      const result: AIResponse = {
        content: data.choices[0].message.content,
        source: "xai",
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: data.model || "x-ai/grok-3-beta",
      };
      AIService.updateLatency("xai", result.responseTime);
      return result;
    } catch (error) {
      if (
        keyUsed &&
        error instanceof Error &&
        (error.message.includes("429") || error.message.includes("401"))
      ) {
        APIConfigManager.markKeyAsFailed(keyUsed);
        APIConfigManager.rotateKey("fastrouter");
      }

      return {
        content: "",
        source: "xai",
        success: false,
        error: "Service temporarily unavailable",
        responseTime: Date.now() - startTime,
      };
    }
  }

  // OpenAI API implementation
  // OpenAI API implementation via FastRouter
  private static async callOpenAIAPI(message: string): Promise<AIResponse> {
    const startTime = Date.now();
    let keyUsed: string | null = null;

    try {
      // Use FastRouter API key for OpenAI models
      keyUsed = await APIConfigManager.getNextFastRouterKey();

      if (!keyUsed) {
        return {
          content: "",
          source: "openai",
          success: false,
          error: "No FastRouter API keys available for OpenAI",
          responseTime: Date.now() - startTime,
        };
      }

      const response = await fetch(
        "https://go.fastrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keyUsed}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are OpenAI GPT, a helpful AI assistant. Provide clear, accurate, and comprehensive responses to user queries.",
              },
              {
                role: "user",
                content: message,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `OpenAI API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage += ` - ${errorData}`;
        }

        if (response.status === 429 || response.status === 401) {
          APIConfigManager.markKeyAsFailed(keyUsed);
          APIConfigManager.rotateKey("fastrouter");
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenAI API");
      }

      const result: AIResponse = {
        content: data.choices[0].message.content,
        source: "openai",
        success: true,
        keyUsed,
        responseTime: Date.now() - startTime,
        model: data.model || "openai/gpt-4o",
      };
      AIService.updateLatency("openai", result.responseTime);
      return result;
    } catch (error) {
      if (
        keyUsed &&
        error instanceof Error &&
        (error.message.includes("429") || error.message.includes("401"))
      ) {
        APIConfigManager.markKeyAsFailed(keyUsed);
        APIConfigManager.rotateKey("fastrouter");
      }

      return {
        content: "",
        source: "openai",
        success: false,
        error: "Service temporarily unavailable",
        responseTime: Date.now() - startTime,
      };
    }
  }
}
