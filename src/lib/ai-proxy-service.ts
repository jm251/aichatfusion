/**
 * AI Proxy Service - Secure API calls through backend proxy
 * Keys never leave the server - all AI API calls are made server-side
 */

import { AIResponse } from './types';
import { APIBackendClient } from './api-backend-client';
import { getBackendUrl } from './backend-url';

export type ProxyService = 'groq' | 'gemini' | 'cohere' | 'github' | 'openrouter' | 'xai' | 'fastrouter' | 'openai';
export interface ProxyTarget {
    id: string;
    service: ProxyService;
    model?: string;
}

export class AIProxyService {
    private static backendUrl = getBackendUrl();
    private static sessionToken: string | null = null;
    private static readonly MAX_MODELS_PER_PROVIDER = 4;
    private static readonly OPENAI_MODEL_STORAGE_KEY = 'openai-selected-models';
    private static readonly OPENAI_LEGACY_MODEL_STORAGE_KEY = 'openai-selected-model';
    private static readonly FASTROUTER_MODEL_STORAGE_KEY = 'fastrouter-selected-models';

    // Latency tracking for smart routing
    private static serviceLatency: Record<string, { avg: number; count: number }> = {};
    private static baselineLatency: Record<string, number> = {
        groq: 600,
        openai: 1000,
        xai: 1050,
        cohere: 1100,
        github: 1300,
        openrouter: 1500,
        fastrouter: 1600,
        gemini: 1800,
    };

    private static updateLatency(service: string, ms: number) {
        const stat = this.serviceLatency[service] || { avg: 0, count: 0 };
        stat.count += 1;
        stat.avg = (stat.avg * (stat.count - 1) + ms) / stat.count;
        this.serviceLatency[service] = stat;
    }

    private static getEffectiveLatency(service: string): number {
        return this.serviceLatency[service]?.avg || this.baselineLatency[service] || 1500;
    }

    private static readStoredModels(storageKey: string): string[] {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return Array.from(
                new Set(
                    parsed
                        .filter((value: unknown) => typeof value === 'string')
                        .map((value: string) => value.trim())
                        .filter((value: string) => value.length > 0 && value !== '__auto__')
                )
            ).slice(0, this.MAX_MODELS_PER_PROVIDER);
        } catch {
            return [];
        }
    }

    static getSelectedOpenAIModels(): string[] {
        const selected = this.readStoredModels(this.OPENAI_MODEL_STORAGE_KEY);
        if (selected.length > 0) return selected;

        const legacy = localStorage.getItem(this.OPENAI_LEGACY_MODEL_STORAGE_KEY);
        if (!legacy || legacy === '__auto__') return [];

        const normalized = legacy.trim();
        return normalized ? [normalized] : [];
    }

    static getSelectedFastRouterModels(): string[] {
        return this.readStoredModels(this.FASTROUTER_MODEL_STORAGE_KEY);
    }

    static buildTargetsFromServices(selectedServices?: ProxyService[]): ProxyTarget[] {
        const services: ProxyService[] = selectedServices?.length
            ? selectedServices
            : ['groq', 'gemini', 'cohere', 'github', 'openrouter', 'fastrouter', 'openai'];

        const targets: ProxyTarget[] = [];

        for (const service of services) {
            if (service === 'openai') {
                const models = this.getSelectedOpenAIModels();
                if (models.length === 0) {
                    targets.push({ id: 'openai:auto', service: 'openai' });
                } else {
                    for (const model of models.slice(0, this.MAX_MODELS_PER_PROVIDER)) {
                        targets.push({ id: `openai:${model}`, service: 'openai', model });
                    }
                }
                continue;
            }

            if (service === 'fastrouter') {
                const models = this.getSelectedFastRouterModels();
                if (models.length === 0) {
                    targets.push({ id: 'fastrouter:auto', service: 'fastrouter' });
                } else {
                    for (const model of models.slice(0, this.MAX_MODELS_PER_PROVIDER)) {
                        targets.push({ id: `fastrouter:${model}`, service: 'fastrouter', model });
                    }
                }
                continue;
            }

            targets.push({ id: `${service}:default`, service });
        }

        return targets;
    }

    private static async ensureSession(): Promise<string> {
        if (this.sessionToken) return this.sessionToken;

        await APIBackendClient.ensureSession();
        const storedToken = sessionStorage.getItem('api-session-token');
        if (storedToken) {
            this.sessionToken = storedToken;
            return storedToken;
        }

        throw new Error('No session available');
    }

    /**
     * Call AI service through secure backend proxy
     * Keys never leave the server
     */
    static async callProxy(service: ProxyService, message: string, model?: string): Promise<AIResponse> {
        const startTime = Date.now();

        try {
            const token = await this.ensureSession();
            const requestBody: Record<string, unknown> = { message };

            if ((service === 'openai' || service === 'fastrouter') && model) {
                requestBody.model = model;
            }

            const response = await fetch(`${this.backendUrl}/api/proxy/${service}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-token': token,
                },
                body: JSON.stringify(requestBody),
            });

            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                // Handle session expiry
                if (response.status === 401) {
                    this.sessionToken = null;
                    sessionStorage.removeItem('api-session-token');
                }

                return {
                    content: '',
                    source: service as AIResponse['source'],
                    success: false,
                    error: `Service temporarily unavailable`,
                    responseTime,
                };
            }

            const data = await response.json();
            this.updateLatency(service, responseTime);

            return {
                content: data.content || '',
                source: service as AIResponse['source'],
                success: data.success ?? true,
                model: data.model,
                responseTime,
            };
        } catch (error) {
            return {
                content: '',
                source: service as AIResponse['source'],
                success: false,
                error: 'Service temporarily unavailable',
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Get fast response using the quickest available service
     */
    static async getFastResponse(message: string): Promise<AIResponse> {
        // Try services in order of expected latency
        const services: ProxyService[] = ['groq', 'xai', 'cohere', 'openrouter'];

        for (const service of services) {
            const response = await this.callProxy(service, message);
            if (response.success) return response;
        }

        return {
            content: 'All AI services are currently unavailable. Please try again later.',
            source: 'system',
            success: false,
            error: 'All services failed',
        };
    }

    /**
     * Get responses from multiple services in parallel
     */
    static async getComprehensiveResponses(
        message: string,
        selectedTargets?: ProxyTarget[],
        onResponse?: (targetId: string, response: AIResponse) => void
    ): Promise<AIResponse[]> {
        const targets = selectedTargets && selectedTargets.length > 0
            ? selectedTargets
            : this.buildTargetsFromServices();

        // Sort by effective latency for better UX (faster responses arrive first)
        const sortedTargets = [...targets].sort(
            (a, b) => this.getEffectiveLatency(a.service) - this.getEffectiveLatency(b.service)
        );

        const promises = sortedTargets.map(async (target) => {
            const response = await this.callProxy(target.service, message, target.model);
            if (onResponse) onResponse(target.id, response);
            return response;
        });

        const results = await Promise.allSettled(promises);
        return results
            .filter((r): r is PromiseFulfilledResult<AIResponse> => r.status === 'fulfilled')
            .map(r => r.value)
            .filter(r => r.success);
    }

    /**
     * Get consensus response from multiple models
     */
    static async getConsensusResponse(
        message: string,
        selectedServices?: ProxyService[]
    ): Promise<{ content: string; confidence: number; models: string[] }> {
        const targets = this.buildTargetsFromServices(selectedServices);
        const responses = await this.getComprehensiveResponses(message, targets);

        if (responses.length === 0) {
            return {
                content: 'Unable to generate consensus - no responses available.',
                confidence: 0,
                models: [],
            };
        }

        if (responses.length === 1) {
            return {
                content: responses[0].content,
                confidence: 0.5,
                models: [responses[0].model || responses[0].source],
            };
        }

        // Simple consensus: use the longest response as primary, note agreement
        const sortedByLength = [...responses].sort((a, b) => b.content.length - a.content.length);
        const primary = sortedByLength[0];

        // Calculate simple confidence based on response count
        const confidence = Math.min(0.95, 0.5 + (responses.length * 0.1));

        const models = responses.map(r => r.model || r.source);

        return {
            content: `**Consensus from ${responses.length} AI models:**\n\n${primary.content}\n\n---\n*Models consulted: ${models.join(', ')}*`,
            confidence,
            models,
        };
    }

    /**
     * Check which services are available
     */
    static async getAvailableServices(): Promise<Record<string, boolean>> {
        return APIBackendClient.getServiceStatus();
    }
}
