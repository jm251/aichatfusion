import { APIBackendClient } from "./api-backend-client";
import { getBackendUrl } from "./backend-url";
import type {
  ApprovalThread,
  AssetBundle,
  BrandProfile,
  CompetitorProfile,
  LeadCaptureSession,
  LocalGrowthSource,
  LocationProfile,
  OrganizationWorkspace,
  VisibilityAudit,
} from "./local-growth-types";

function buildEndpoint(path: string): string {
  const backendUrl = getBackendUrl();
  return `${backendUrl}${path}`;
}

async function fetchLocalGrowthEndpoint<T>(
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

export interface FeatureAvailability {
  research: boolean;
  geo: boolean;
  voice: boolean;
  sharing: boolean;
  approvals: boolean;
  analytics: boolean;
  leadAgent: boolean;
  creativeLab: boolean;
}

export interface BrandImportResponse {
  brandSnapshot: Partial<BrandProfile>;
  sources: LocalGrowthSource[];
  competitors: CompetitorProfile[];
}

export interface LocationEnrichResponse {
  location: LocationProfile;
  sources: LocalGrowthSource[];
  competitors: CompetitorProfile[];
}

export interface IntelAuditResponse {
  audit: VisibilityAudit;
  sources: LocalGrowthSource[];
  competitors: CompetitorProfile[];
  mapUrl?: string;
}

export interface ShareBundleResponse {
  enabled: boolean;
  provider: string;
  shareUrl?: string;
}

export interface ApprovalSyncResponse {
  synced: boolean;
  provider: string;
  externalThreadUrl?: string;
}

export interface AnalyticsCaptureResponse {
  tracked: boolean;
  provider: string;
}

export interface VoiceLeadResponse {
  enabled: boolean;
  leadCapture: LeadCaptureSession;
}

export interface VoiceTranscriptionResponse {
  transcript: string;
}

export interface VoiceSynthesisResponse {
  audioDataUrl: string;
}

export interface WorkspaceExportResponse {
  markdown: string;
}

export class LocalGrowthBackendClient {
  static async getFeatureAvailability(): Promise<FeatureAvailability> {
    return fetchLocalGrowthEndpoint<FeatureAvailability>(
      "/api/local-growth/features",
      {
        method: "GET",
      },
    );
  }

  static async importBrand(
    websiteUrl: string,
    brandNotes: string,
  ): Promise<BrandImportResponse> {
    return fetchLocalGrowthEndpoint<BrandImportResponse>(
      "/api/brand/import",
      {
        method: "POST",
        body: JSON.stringify({ websiteUrl, brandNotes }),
      },
    );
  }

  static async enrichLocation(
    payload: {
      name: string;
      addressLine: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      serviceRadiusKm?: number;
      brandName?: string;
      vertical?: string;
    },
  ): Promise<LocationEnrichResponse> {
    return fetchLocalGrowthEndpoint<LocationEnrichResponse>(
      "/api/locations/enrich",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  static async runIntelAudit(
    workspace: OrganizationWorkspace,
    focusLocationIds?: string[],
  ): Promise<IntelAuditResponse> {
    return fetchLocalGrowthEndpoint<IntelAuditResponse>(
      "/api/intel/audit",
      {
        method: "POST",
        body: JSON.stringify({ workspace, focusLocationIds }),
      },
    );
  }

  static async shareBundle(
    bundle: AssetBundle,
    workspace: OrganizationWorkspace,
  ): Promise<ShareBundleResponse> {
    return fetchLocalGrowthEndpoint<ShareBundleResponse>(
      "/api/assets/share",
      {
        method: "POST",
        body: JSON.stringify({ bundle, workspace }),
      },
    );
  }

  static async syncApproval(
    thread: ApprovalThread,
    workspace: OrganizationWorkspace,
  ): Promise<ApprovalSyncResponse> {
    return fetchLocalGrowthEndpoint<ApprovalSyncResponse>(
      "/api/approvals/sync",
      {
        method: "POST",
        body: JSON.stringify({ thread, workspace }),
      },
    );
  }

  static async captureAnalyticsEvent(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<AnalyticsCaptureResponse> {
    return fetchLocalGrowthEndpoint<AnalyticsCaptureResponse>(
      "/api/analytics/capture",
      {
        method: "POST",
        body: JSON.stringify({ event, payload }),
      },
    );
  }

  static async configureLeadAgent(
    workspace: OrganizationWorkspace,
    locationId?: string,
  ): Promise<VoiceLeadResponse> {
    return fetchLocalGrowthEndpoint<VoiceLeadResponse>(
      "/api/voice/lead-agent",
      {
        method: "POST",
        body: JSON.stringify({ workspace, locationId }),
      },
    );
  }

  static async transcribeVoiceBrief(
    audioDataUrl: string,
    fileName?: string,
  ): Promise<VoiceTranscriptionResponse> {
    return fetchLocalGrowthEndpoint<VoiceTranscriptionResponse>(
      "/api/voice/transcribe",
      {
        method: "POST",
        body: JSON.stringify({ audioDataUrl, fileName }),
      },
    );
  }

  static async synthesizeVoiceScript(
    text: string,
  ): Promise<VoiceSynthesisResponse> {
    return fetchLocalGrowthEndpoint<VoiceSynthesisResponse>(
      "/api/voice/synthesize",
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
    );
  }

  static async exportWorkspace(
    workspace: OrganizationWorkspace,
  ): Promise<WorkspaceExportResponse> {
    return fetchLocalGrowthEndpoint<WorkspaceExportResponse>(
      "/api/assets/export-markdown",
      {
        method: "POST",
        body: JSON.stringify({ workspace }),
      },
    );
  }
}
