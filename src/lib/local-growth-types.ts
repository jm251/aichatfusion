import type { Message } from "./types";

export type LocalGrowthStage =
  | "brand"
  | "locations"
  | "intel"
  | "campaign"
  | "approvals"
  | "insights";

export type LocalGrowthSourceType =
  | "website"
  | "competitor"
  | "search"
  | "location"
  | "review"
  | "document"
  | "note";

export type LocalGrowthSourceStatus = "ready" | "processing" | "error";

export type LocalGrowthAssetStatus = "idle" | "generating" | "ready" | "error";

export type LocalGrowthAssetFormat = "markdown" | "text" | "image" | "audio" | "prompt";

export type MarketingChannel =
  | "landing_page"
  | "gbp"
  | "social"
  | "ads"
  | "email"
  | "sms"
  | "review_replies"
  | "voiceover";

export type LocalGrowthAssetType =
  | "brand_voice_summary"
  | "opportunity_matrix"
  | "competitor_summary"
  | "ai_visibility_readiness"
  | "localized_landing_page"
  | "gbp_post_pack"
  | "social_ad_pack"
  | "review_response_pack"
  | "voiceover_script"
  | "creative_prompt"
  | "creative_image";

export interface BrandProfile {
  clientName: string;
  websiteUrl: string;
  vertical: string;
  targetAudience: string;
  coreOffer: string;
  goals: string;
  differentiators: string;
  proofPoints: string;
  voiceExamples: string;
  brandNotes: string;
}

export interface LocationProfile {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  serviceRadiusKm: number;
  timezone?: string;
  notes: string;
  provider?: string;
  updatedAt: number;
}

export interface LocalGrowthSource {
  id: string;
  type: LocalGrowthSourceType;
  title: string;
  summary: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  status: LocalGrowthSourceStatus;
  url?: string;
  provider?: string;
  tags?: string[];
  locationId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  error?: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  url?: string;
  summary: string;
  positioning: string;
  pricingSignal: string;
  reviewThemes: string[];
  strengths: string[];
  gaps: string[];
  distanceKm?: number;
  locationId?: string;
  citations: string[];
  updatedAt: number;
}

export interface VisibilityAuditMetrics {
  localIntentCoverage: number;
  trustSignals: number;
  geoSignals: number;
  offerClarity: number;
  conversionClarity: number;
}

export interface VisibilityAudit {
  id: string;
  title: string;
  summary: string;
  score: number;
  metrics: VisibilityAuditMetrics;
  opportunities: string[];
  risks: string[];
  citations: string[];
  competitorIds: string[];
  locationIds: string[];
  staticMapUrl?: string;
  updatedAt: number;
}

export interface CampaignBrief {
  id: string;
  name: string;
  objective: string;
  offer: string;
  channels: MarketingChannel[];
  targetLocationIds: string[];
  audience: string;
  seasonalContext: string;
  cta: string;
  notes: string;
  status: "draft" | "ready";
  updatedAt: number;
}

export interface LocalGrowthAssetVersion {
  id: string;
  createdAt: number;
  content: string;
  format: LocalGrowthAssetFormat;
  confidence?: number;
  provenance?: string[];
}

export interface LocalGrowthAssetDefinition {
  type: LocalGrowthAssetType;
  title: string;
  description: string;
  format: LocalGrowthAssetFormat;
}

export interface LocalGrowthAsset {
  id: string;
  type: LocalGrowthAssetType;
  title: string;
  description: string;
  status: LocalGrowthAssetStatus;
  format: LocalGrowthAssetFormat;
  currentVersionId?: string;
  imageUrl?: string;
  audioUrl?: string;
  prompt?: string;
  briefId?: string;
  updatedAt?: number;
  lastError?: string;
  versions: LocalGrowthAssetVersion[];
}

export interface AssetBundle {
  id: string;
  title: string;
  briefId?: string;
  locationIds: string[];
  assetIds: string[];
  shareUrl?: string;
  provider?: string;
  status: "draft" | "ready" | "shared";
  updatedAt: number;
}

export interface VoiceSession {
  id: string;
  fileName?: string;
  transcript: string;
  extractedRequests: string[];
  generatedScript: string;
  polishedAudioUrl?: string;
  vapiAssistantId?: string;
  status: "idle" | "processing" | "ready" | "error";
  error?: string;
  updatedAt: number;
}

export interface ApprovalComment {
  id: string;
  author: string;
  body: string;
  createdAt: number;
}

export interface ApprovalThread {
  id: string;
  title: string;
  assetIds: string[];
  assignee: string;
  status: "draft" | "review" | "approved" | "changes_requested";
  comments: ApprovalComment[];
  externalThreadUrl?: string;
  provider?: string;
  updatedAt: number;
}

export interface LeadCaptureSession {
  id: string;
  locationId?: string;
  status: "disabled" | "configured" | "live";
  summary: string;
  provider?: string;
  assistantId?: string;
  updatedAt: number;
}

export interface OrganizationWorkspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  stage: LocalGrowthStage;
  brand: BrandProfile;
  locations: LocationProfile[];
  sources: LocalGrowthSource[];
  competitors: CompetitorProfile[];
  audits: VisibilityAudit[];
  briefs: CampaignBrief[];
  assets: LocalGrowthAsset[];
  bundles: AssetBundle[];
  voiceSessions: VoiceSession[];
  approvals: ApprovalThread[];
  leadCaptureSessions: LeadCaptureSession[];
  copilotMessages: Message[];
}

export const localGrowthStageOrder: LocalGrowthStage[] = [
  "brand",
  "locations",
  "intel",
  "campaign",
  "approvals",
  "insights",
];

export const localGrowthStageLabels: Record<LocalGrowthStage, string> = {
  brand: "Brand Setup",
  locations: "Location Setup",
  intel: "Market Intel",
  campaign: "Campaign Studio",
  approvals: "Approve & Measure",
  insights: "Insights",
};

export const localGrowthAssetCatalog: LocalGrowthAssetDefinition[] = [
  {
    type: "brand_voice_summary",
    title: "Brand Voice Summary",
    description: "Voice rules, positioning cues, and local content guardrails.",
    format: "markdown",
  },
  {
    type: "opportunity_matrix",
    title: "Opportunity Matrix",
    description: "Location-by-location growth priorities and next moves.",
    format: "markdown",
  },
  {
    type: "competitor_summary",
    title: "Competitor Summary",
    description: "Competitor themes, gaps, and proof-backed takeaways.",
    format: "markdown",
  },
  {
    type: "ai_visibility_readiness",
    title: "AI Visibility Readiness Audit",
    description: "Readiness score, trust signals, and geo content gaps.",
    format: "markdown",
  },
  {
    type: "localized_landing_page",
    title: "Localized Landing Page",
    description: "Location-aware hero, proof, local SEO, and CTA copy.",
    format: "markdown",
  },
  {
    type: "gbp_post_pack",
    title: "GBP Post Pack",
    description: "Google Business Profile post ideas and copy variants.",
    format: "markdown",
  },
  {
    type: "social_ad_pack",
    title: "Social + Ad Pack",
    description: "Social captions, ad angles, hooks, and CTA variants.",
    format: "markdown",
  },
  {
    type: "review_response_pack",
    title: "Review Response Pack",
    description: "Positive, neutral, and negative review reply templates.",
    format: "markdown",
  },
  {
    type: "voiceover_script",
    title: "Voiceover Script",
    description: "Promo or local campaign voiceover copy.",
    format: "markdown",
  },
  {
    type: "creative_prompt",
    title: "Creative Prompt",
    description: "Prompt package for image and creative generation.",
    format: "prompt",
  },
  {
    type: "creative_image",
    title: "Creative Image",
    description: "Generated local campaign creative.",
    format: "image",
  },
];

export function createLocalGrowthId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyOrganizationWorkspace(): OrganizationWorkspace {
  const now = Date.now();

  return {
    id: createLocalGrowthId("workspace"),
    name: "Untitled local growth workspace",
    createdAt: now,
    updatedAt: now,
    stage: "brand",
    brand: {
      clientName: "",
      websiteUrl: "",
      vertical: "",
      targetAudience: "",
      coreOffer: "",
      goals: "",
      differentiators: "",
      proofPoints: "",
      voiceExamples: "",
      brandNotes: "",
    },
    locations: [],
    sources: [],
    competitors: [],
    audits: [],
    briefs: [],
    assets: localGrowthAssetCatalog.map((artifact) => ({
      id: createLocalGrowthId(`asset-${artifact.type}`),
      type: artifact.type,
      title: artifact.title,
      description: artifact.description,
      status: "idle",
      format: artifact.format,
      versions: [],
    })),
    bundles: [],
    voiceSessions: [],
    approvals: [],
    leadCaptureSessions: [],
    copilotMessages: [],
  };
}
