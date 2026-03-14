import { APIBackendClient } from "./api-backend-client";
import { getBackendUrl } from "./backend-url";
import type { FounderSource, FounderWorkspace } from "./founder-types";

function buildEndpoint(path: string): string {
  const backendUrl = getBackendUrl();
  return `${backendUrl}${path}`;
}

async function fetchFounderEndpoint<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  await APIBackendClient.ensureSession();
  const token = APIBackendClient.getSessionToken();

  if (!token) {
    throw new Error("No session token available");
  }

  const response = await fetch(buildEndpoint(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-session-token": token,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as
      | { error?: string; details?: string }
      | null;
    throw new Error(
      errorData?.details || errorData?.error || `Request failed: ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

export interface FounderSearchResponse {
  results: FounderSource[];
  answer?: string;
}

export interface FounderUrlIngestResponse {
  source: FounderSource;
}

export interface FounderTranscriptionResponse {
  transcript: string;
}

export interface FounderSynthesisResponse {
  audioDataUrl: string;
}

export interface FounderExportResponse {
  markdown: string;
}

export class FounderBackendClient {
  static async searchMarketEvidence(
    query: string,
    workspaceSummary: string,
  ): Promise<FounderSearchResponse> {
    return fetchFounderEndpoint<FounderSearchResponse>(
      "/api/founder/research/search",
      {
        method: "POST",
        body: JSON.stringify({ query, workspaceSummary }),
      },
    );
  }

  static async ingestUrl(url: string): Promise<FounderUrlIngestResponse> {
    return fetchFounderEndpoint<FounderUrlIngestResponse>(
      "/api/founder/research/ingest-url",
      {
        method: "POST",
        body: JSON.stringify({ url }),
      },
    );
  }

  static async transcribePitch(
    audioDataUrl: string,
    fileName?: string,
  ): Promise<FounderTranscriptionResponse> {
    return fetchFounderEndpoint<FounderTranscriptionResponse>(
      "/api/founder/rehearsal/transcribe",
      {
        method: "POST",
        body: JSON.stringify({ audioDataUrl, fileName }),
      },
    );
  }

  static async synthesizePitch(
    text: string,
  ): Promise<FounderSynthesisResponse> {
    return fetchFounderEndpoint<FounderSynthesisResponse>(
      "/api/founder/rehearsal/synthesize",
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
    );
  }

  static async exportWorkspace(
    workspace: FounderWorkspace,
  ): Promise<FounderExportResponse> {
    return fetchFounderEndpoint<FounderExportResponse>(
      "/api/founder/export/markdown",
      {
        method: "POST",
        body: JSON.stringify({ workspace }),
      },
    );
  }
}
