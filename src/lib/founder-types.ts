import type { Message } from "./types";

export type FounderStage =
  | "brief"
  | "evidence"
  | "strategy"
  | "launch"
  | "rehearsal";

export type FounderSourceType = "document" | "url" | "search";

export type FounderSourceStatus = "ready" | "processing" | "error";

export type FounderArtifactStatus = "idle" | "generating" | "ready" | "error";

export type FounderArtifactFormat = "markdown" | "text" | "image" | "prompt";

export type FounderArtifactType =
  | "problem_statement"
  | "icp_pain_points"
  | "competitor_matrix"
  | "positioning_statement"
  | "gtm_launch_plan"
  | "landing_page_copy"
  | "deck_outline"
  | "faq_objection_handling"
  | "pitch_script_30"
  | "pitch_script_90"
  | "hero_visual";

export interface FounderBrief {
  startupName: string;
  tagline: string;
  problem: string;
  solution: string;
  targetCustomer: string;
  market: string;
  businessModel: string;
  stage: string;
  goals: string;
  differentiation: string;
  constraints: string;
}

export interface FounderSource {
  id: string;
  type: FounderSourceType;
  title: string;
  summary: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  status: FounderSourceStatus;
  url?: string;
  provider?: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null>;
  error?: string;
}

export interface FounderArtifactVersion {
  id: string;
  createdAt: number;
  content: string;
  format: FounderArtifactFormat;
  model?: string;
  confidence?: number;
  provenance?: string[];
}

export interface FounderArtifactDefinition {
  type: FounderArtifactType;
  title: string;
  description: string;
  format: FounderArtifactFormat;
}

export interface FounderArtifact {
  type: FounderArtifactType;
  title: string;
  description: string;
  status: FounderArtifactStatus;
  format: FounderArtifactFormat;
  versions: FounderArtifactVersion[];
  currentVersionId?: string;
  updatedAt?: number;
  imageUrl?: string;
  prompt?: string;
  lastError?: string;
}

export interface FounderScorecard {
  clarity: number;
  differentiation: number;
  credibility: number;
  brevity: number;
  investorReadiness: number;
}

export interface FounderRehearsalSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  transcript: string;
  critique: string;
  improvedScript: string;
  objectionPrompts: string[];
  status: "idle" | "processing" | "ready" | "error";
  scorecard: FounderScorecard;
  audioDataUrl?: string;
  polishedAudioUrl?: string;
  error?: string;
}

export interface FounderWorkspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  stage: FounderStage;
  brief: FounderBrief;
  sources: FounderSource[];
  artifacts: FounderArtifact[];
  rehearsalSessions: FounderRehearsalSession[];
  copilotMessages: Message[];
}

export const founderArtifactCatalog: FounderArtifactDefinition[] = [
  {
    type: "problem_statement",
    title: "Problem Statement",
    description: "What painful problem exists and why it matters now.",
    format: "markdown",
  },
  {
    type: "icp_pain_points",
    title: "ICP + Pain Points",
    description: "Ideal customer profile, context, and acute pain.",
    format: "markdown",
  },
  {
    type: "competitor_matrix",
    title: "Competitor Matrix",
    description: "Landscape snapshot with wedges, gaps, and moats.",
    format: "markdown",
  },
  {
    type: "positioning_statement",
    title: "Positioning Statement",
    description: "Ownable narrative, wedge, and investor-friendly framing.",
    format: "markdown",
  },
  {
    type: "gtm_launch_plan",
    title: "GTM Launch Plan",
    description: "Launch channels, experiments, and first traction plan.",
    format: "markdown",
  },
  {
    type: "landing_page_copy",
    title: "Landing Page Copy",
    description: "Hero, proof, features, CTAs, and conversion copy.",
    format: "markdown",
  },
  {
    type: "deck_outline",
    title: "Deck Outline",
    description: "Slide-by-slide investor narrative and talking points.",
    format: "markdown",
  },
  {
    type: "faq_objection_handling",
    title: "FAQ + Objection Handling",
    description: "Likely customer and investor objections with responses.",
    format: "markdown",
  },
  {
    type: "pitch_script_30",
    title: "30-Second Pitch",
    description: "Compressed intro built for fast demo or networking moments.",
    format: "markdown",
  },
  {
    type: "pitch_script_90",
    title: "90-Second Pitch",
    description: "Demo day pitch with momentum, proof, and ask.",
    format: "markdown",
  },
  {
    type: "hero_visual",
    title: "Hero Visual",
    description: "Generated hero image and creative prompt for your launch assets.",
    format: "image",
  },
];

export const founderArtifactSections = {
  strategy: {
    PROBLEM_STATEMENT: "problem_statement",
    ICP_PAIN_POINTS: "icp_pain_points",
    COMPETITOR_MATRIX: "competitor_matrix",
    POSITIONING_STATEMENT: "positioning_statement",
    GTM_LAUNCH_PLAN: "gtm_launch_plan",
  },
  launch: {
    LANDING_PAGE_COPY: "landing_page_copy",
    DECK_OUTLINE: "deck_outline",
    FAQ_OBJECTION_HANDLING: "faq_objection_handling",
    PITCH_SCRIPT_30: "pitch_script_30",
    PITCH_SCRIPT_90: "pitch_script_90",
    HERO_VISUAL_PROMPT: "hero_visual",
  },
} as const satisfies Record<
  string,
  Record<string, FounderArtifactType>
>;

export const founderStageOrder: FounderStage[] = [
  "brief",
  "evidence",
  "strategy",
  "launch",
  "rehearsal",
];

export const founderStageLabels: Record<FounderStage, string> = {
  brief: "Brief",
  evidence: "Evidence",
  strategy: "Strategy",
  launch: "Launch Kit",
  rehearsal: "Rehearsal",
};

export function createFounderId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyFounderWorkspace(): FounderWorkspace {
  const now = Date.now();

  return {
    id: createFounderId("workspace"),
    name: "Untitled startup pack",
    createdAt: now,
    updatedAt: now,
    stage: "brief",
    brief: {
      startupName: "",
      tagline: "",
      problem: "",
      solution: "",
      targetCustomer: "",
      market: "",
      businessModel: "",
      stage: "Idea",
      goals: "",
      differentiation: "",
      constraints: "",
    },
    sources: [],
    artifacts: founderArtifactCatalog.map((artifact) => ({
      type: artifact.type,
      title: artifact.title,
      description: artifact.description,
      status: "idle",
      format: artifact.format,
      versions: [],
    })),
    rehearsalSessions: [],
    copilotMessages: [],
  };
}
