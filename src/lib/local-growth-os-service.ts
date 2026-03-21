import { AIService } from "./ai-service";
import { ImageGenerationService } from "./image-generation-service";
import type { Message } from "./types";
import {
  createLocalGrowthId,
  type AssetBundle,
  type CampaignBrief,
  type LocalGrowthAsset,
  type LocalGrowthAssetType,
  type OrganizationWorkspace,
  type VoiceSession,
} from "./local-growth-types";

const backstageRoles = [
  "Scout",
  "Analyst",
  "Localizer",
  "Critic",
  "Producer",
  "Judge",
];

const sectionHeadingPattern = /^##\s+([A-Z0-9_]+)\s*$/gm;

const intelSections = {
  BRAND_VOICE_SUMMARY: "brand_voice_summary",
  OPPORTUNITY_MATRIX: "opportunity_matrix",
  COMPETITOR_SUMMARY: "competitor_summary",
  AI_VISIBILITY_READINESS: "ai_visibility_readiness",
} as const satisfies Record<string, LocalGrowthAssetType>;

const campaignSections = {
  LOCALIZED_LANDING_PAGE: "localized_landing_page",
  GBP_POST_PACK: "gbp_post_pack",
  SOCIAL_AD_PACK: "social_ad_pack",
  REVIEW_RESPONSE_PACK: "review_response_pack",
  VOICEOVER_SCRIPT: "voiceover_script",
  CREATIVE_PROMPT: "creative_prompt",
} as const satisfies Record<string, LocalGrowthAssetType>;

function trimBlock(value: string): string {
  return value.replace(/^\s+|\s+$/g, "");
}

function compactList(items: string[]): string {
  return items.filter(Boolean).join(", ") || "None";
}

function buildBrandSummary(workspace: OrganizationWorkspace): string {
  const brand = workspace.brand;
  return [
    `Client: ${brand.clientName || "Untitled client"}`,
    `Website: ${brand.websiteUrl || "Not provided"}`,
    `Vertical: ${brand.vertical || "Not provided"}`,
    `Audience: ${brand.targetAudience || "Not provided"}`,
    `Core offer: ${brand.coreOffer || "Not provided"}`,
    `Goals: ${brand.goals || "Not provided"}`,
    `Differentiators: ${brand.differentiators || "Not provided"}`,
    `Proof points: ${brand.proofPoints || "Not provided"}`,
    `Voice examples: ${brand.voiceExamples || "Not provided"}`,
    `Brand notes: ${brand.brandNotes || "Not provided"}`,
  ].join("\n");
}

function buildLocationSummary(workspace: OrganizationWorkspace): string {
  if (workspace.locations.length === 0) {
    return "No locations have been added yet.";
  }

  return workspace.locations
    .slice(0, 12)
    .map((location, index) => {
      const address = [
        location.addressLine,
        location.city,
        location.region,
        location.postalCode,
        location.country,
      ]
        .filter(Boolean)
        .join(", ");
      return [
        `Location ${index + 1}: ${location.name || "Untitled location"}`,
        `Address: ${address || "Not provided"}`,
        `Service radius: ${location.serviceRadiusKm} km`,
        `Notes: ${location.notes || "None"}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function buildSourceSummary(workspace: OrganizationWorkspace): string {
  if (workspace.sources.length === 0) {
    return "No market-intel sources yet.";
  }

  return workspace.sources
    .slice(0, 12)
    .map((source, index) => {
      const body = source.summary || source.content || "No captured content.";
      return `Source ${index + 1}: ${source.title} (${source.type}${
        source.provider ? ` via ${source.provider}` : ""
      })\n${body}`;
    })
    .join("\n\n---\n\n");
}

function buildCompetitorSummary(workspace: OrganizationWorkspace): string {
  if (workspace.competitors.length === 0) {
    return "No competitors captured yet.";
  }

  return workspace.competitors
    .slice(0, 8)
    .map((competitor, index) => {
      return [
        `Competitor ${index + 1}: ${competitor.name}`,
        `URL: ${competitor.url || "Unknown"}`,
        `Positioning: ${competitor.positioning || "Unknown"}`,
        `Pricing: ${competitor.pricingSignal || "Unknown"}`,
        `Strengths: ${compactList(competitor.strengths)}`,
        `Gaps: ${compactList(competitor.gaps)}`,
        `Themes: ${compactList(competitor.reviewThemes)}`,
        `Summary: ${competitor.summary || "No summary"}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function buildAuditSummary(workspace: OrganizationWorkspace): string {
  if (workspace.audits.length === 0) {
    return "No AI visibility audits yet.";
  }

  return workspace.audits
    .slice(0, 4)
    .map((audit) => {
      return [
        `Audit: ${audit.title}`,
        `Score: ${audit.score}/100`,
        `Summary: ${audit.summary}`,
        `Opportunities: ${compactList(audit.opportunities)}`,
        `Risks: ${compactList(audit.risks)}`,
        `Citations: ${compactList(audit.citations)}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function parseSectionedContent<T extends Record<string, LocalGrowthAssetType>>(
  content: string,
  sectionMap: T,
): Partial<Record<LocalGrowthAssetType, string>> {
  const matches = [...content.matchAll(sectionHeadingPattern)];
  if (matches.length === 0) {
    return {};
  }

  const parsed: Partial<Record<LocalGrowthAssetType, string>> = {};

  matches.forEach((match, index) => {
    const heading = match[1];
    const assetType = sectionMap[heading];
    if (!assetType) return;

    const start = match.index! + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index! : content.length;
    const block = trimBlock(content.slice(start, end));
    if (block) parsed[assetType] = block;
  });

  return parsed;
}

function upsertAssetVersion(
  asset: LocalGrowthAsset,
  content: string,
  options?: {
    format?: LocalGrowthAsset["format"];
    confidence?: number;
    imageUrl?: string;
    audioUrl?: string;
    provenance?: string[];
    prompt?: string;
    briefId?: string;
  },
): LocalGrowthAsset {
  const versionId = createLocalGrowthId("asset-version");
  const createdAt = Date.now();

  return {
    ...asset,
    status: "ready",
    format: options?.format || asset.format,
    currentVersionId: versionId,
    updatedAt: createdAt,
    imageUrl: options?.imageUrl ?? asset.imageUrl,
    audioUrl: options?.audioUrl ?? asset.audioUrl,
    prompt: options?.prompt ?? asset.prompt,
    briefId: options?.briefId ?? asset.briefId,
    lastError: undefined,
    versions: [
      {
        id: versionId,
        createdAt,
        content,
        format: options?.format || asset.format,
        confidence: options?.confidence,
        provenance: options?.provenance,
      },
      ...asset.versions,
    ],
  };
}

function markAssetGenerating(asset: LocalGrowthAsset): LocalGrowthAsset {
  return {
    ...asset,
    status: "generating",
    lastError: undefined,
  };
}

function markAssetError(
  asset: LocalGrowthAsset,
  errorMessage: string,
): LocalGrowthAsset {
  return {
    ...asset,
    status: "error",
    lastError: errorMessage,
    updatedAt: Date.now(),
  };
}

function extractJsonBlock<T>(content: string): T | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.error("Failed to parse Local Growth OS JSON block:", error);
    return null;
  }
}

export class LocalGrowthOSService {
  static createResearchQuery(workspace: OrganizationWorkspace): string {
    const brandName = workspace.brand.clientName || "local business";
    const vertical = workspace.brand.vertical || "services";
    const offer = workspace.brand.coreOffer || "offer";
    const primaryLocation = workspace.locations[0];
    const geoHint = primaryLocation
      ? `${primaryLocation.city} ${primaryLocation.region} ${primaryLocation.country}`
      : "nearby market";

    return `${brandName} ${vertical} ${offer} ${geoHint} competitors reviews local SEO AI search visibility`;
  }

  static buildWorkspaceSummary(workspace: OrganizationWorkspace): string {
    return [
      "## Brand",
      buildBrandSummary(workspace),
      "",
      "## Locations",
      buildLocationSummary(workspace),
      "",
      "## Sources",
      buildSourceSummary(workspace),
      "",
      "## Competitors",
      buildCompetitorSummary(workspace),
      "",
      "## Audits",
      buildAuditSummary(workspace),
    ].join("\n");
  }

  static async generateIntelAssets(
    workspace: OrganizationWorkspace,
    userId?: string,
  ): Promise<Record<LocalGrowthAssetType, { content: string; confidence?: number }>> {
    const prompt = `You are Local Growth OS, a backstage multi-agent panel with these roles: ${backstageRoles.join(
      ", ",
    )}.

Your mission is to turn this local marketing workspace into a source-backed market-intel operating layer.

${this.buildWorkspaceSummary(workspace)}

Instructions:
- Scout: identify local market demand, competitor moves, and offer gaps.
- Analyst: convert the evidence into a readiness score and location opportunities.
- Localizer: make every recommendation geo-aware and location specific.
- Critic: call out weak claims, missing trust signals, and compliance risks.
- Producer: produce crisp, usable markdown for operators.
- Judge: synthesize the strongest final answer.

Return markdown only. Use these exact section headings and no others:
## BRAND_VOICE_SUMMARY
## OPPORTUNITY_MATRIX
## COMPETITOR_SUMMARY
## AI_VISIBILITY_READINESS

Requirements:
- Make the brand voice summary actionable, not fluffy.
- Opportunity matrix must be location-by-location and prioritize the next 30 days.
- Competitor summary must reference concrete proof and visible gaps.
- AI visibility readiness must include score, strengths, risks, and a checklist.
- Explicitly label any inference as inferred when not directly evidenced.`;

    const response = await AIService.generateConsensusResponse(
      prompt,
      undefined,
      undefined,
      userId,
    );

    if (!response.success) {
      throw new Error(response.error || "Market intel generation failed");
    }

    const parsed = parseSectionedContent(response.content, intelSections);
    if (Object.keys(parsed).length === 0) {
      throw new Error("Intel response did not contain expected sections");
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([assetType, content]) => [
        assetType,
        { content: content as string, confidence: response.confidence },
      ]),
    ) as Record<LocalGrowthAssetType, { content: string; confidence?: number }>;
  }

  static async generateCampaignAssets(
    workspace: OrganizationWorkspace,
    brief: CampaignBrief,
    userId?: string,
  ): Promise<Record<LocalGrowthAssetType, { content: string; confidence?: number }>> {
    const locationNames = workspace.locations
      .filter((location) => brief.targetLocationIds.includes(location.id))
      .map((location) => location.name || location.city)
      .filter(Boolean)
      .join(", ");

    const prompt = `You are Local Growth OS, a backstage multi-agent panel with these roles: ${backstageRoles.join(
      ", ",
    )}.

Create a local campaign asset bundle for this brief.

${this.buildWorkspaceSummary(workspace)}

## Campaign Brief
- Name: ${brief.name || "Untitled campaign"}
- Objective: ${brief.objective || "Not provided"}
- Offer: ${brief.offer || "Not provided"}
- Channels: ${brief.channels.join(", ") || "Not provided"}
- Locations: ${locationNames || "All active locations"}
- Audience: ${brief.audience || "Not provided"}
- Seasonal context: ${brief.seasonalContext || "Not provided"}
- CTA: ${brief.cta || "Not provided"}
- Notes: ${brief.notes || "None"}

Return markdown only. Use these exact section headings and no others:
## LOCALIZED_LANDING_PAGE
## GBP_POST_PACK
## SOCIAL_AD_PACK
## REVIEW_RESPONSE_PACK
## VOICEOVER_SCRIPT
## CREATIVE_PROMPT

Requirements:
- Make everything location specific where possible.
- Landing page copy must include local proof, local offer framing, FAQ, and CTA.
- GBP post pack should contain at least 4 post variations.
- Social ad pack should include hooks, primary text, headline, CTA, and one email/SMS follow-up.
- Review response pack should include positive, neutral, and negative templates.
- Voiceover script should sound like a promo a local team could actually use.
- Creative prompt should describe a premium static campaign visual with local context.
- Explicitly label inferred claims when evidence is weak.`;

    const response = await AIService.generateConsensusResponse(
      prompt,
      undefined,
      undefined,
      userId,
    );

    if (!response.success) {
      throw new Error(response.error || "Campaign generation failed");
    }

    const parsed = parseSectionedContent(response.content, campaignSections);
    if (Object.keys(parsed).length === 0) {
      throw new Error("Campaign response did not contain expected sections");
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([assetType, content]) => [
        assetType,
        { content: content as string, confidence: response.confidence },
      ]),
    ) as Record<LocalGrowthAssetType, { content: string; confidence?: number }>;
  }

  static applyGeneratedAssets(
    workspace: OrganizationWorkspace,
    updates: Record<LocalGrowthAssetType, { content: string; confidence?: number }>,
    briefId?: string,
  ): OrganizationWorkspace {
    return {
      ...workspace,
      updatedAt: Date.now(),
      assets: workspace.assets.map((asset) => {
        const next = updates[asset.type];
        if (!next?.content) return asset;

        return upsertAssetVersion(asset, next.content, {
          confidence: next.confidence,
          provenance: backstageRoles,
          briefId,
          format: asset.format,
          prompt: asset.type === "creative_prompt" ? next.content : asset.prompt,
        });
      }),
    };
  }

  static markAssetsGenerating(
    workspace: OrganizationWorkspace,
    assetTypes: LocalGrowthAssetType[],
  ): OrganizationWorkspace {
    return {
      ...workspace,
      assets: workspace.assets.map((asset) =>
        assetTypes.includes(asset.type) ? markAssetGenerating(asset) : asset,
      ),
    };
  }

  static markAssetsError(
    workspace: OrganizationWorkspace,
    assetTypes: LocalGrowthAssetType[],
    errorMessage: string,
  ): OrganizationWorkspace {
    return {
      ...workspace,
      updatedAt: Date.now(),
      assets: workspace.assets.map((asset) =>
        assetTypes.includes(asset.type) ? markAssetError(asset, errorMessage) : asset,
      ),
    };
  }

  static async generateCreativeImage(
    workspace: OrganizationWorkspace,
    userId?: string,
  ): Promise<{ prompt: string; imageUrl: string }> {
    const promptAsset = workspace.assets.find((asset) => asset.type === "creative_prompt");
    const currentPrompt =
      promptAsset?.currentVersionId
        ? promptAsset.versions.find((version) => version.id === promptAsset.currentVersionId)?.content
        : "";

    const fallbackPrompt = `Create a premium local marketing creative for ${
      workspace.brand.clientName || "a local business"
    } in ${workspace.brand.vertical || "services"}, highlighting ${
      workspace.brand.coreOffer || "the primary offer"
    } with geo-specific credibility and a strong CTA.`;

    const prompt = currentPrompt || fallbackPrompt;
    const response = await ImageGenerationService.generateImage({
      prompt,
      model: "openai/dall-e-3",
    });

    if (!response.success || !(response.imageUrl || response.imageData)) {
      throw new Error(response.error || "Creative image generation failed");
    }

    const imageUrl = response.imageUrl || `data:image/png;base64,${response.imageData}`;

    if (userId) {
      void userId;
    }

    return {
      prompt,
      imageUrl,
    };
  }

  static applyCreativeImage(
    workspace: OrganizationWorkspace,
    creativeImage: { prompt: string; imageUrl: string },
  ): OrganizationWorkspace {
    return {
      ...workspace,
      updatedAt: Date.now(),
      assets: workspace.assets.map((asset) => {
        if (asset.type !== "creative_image") return asset;

        return {
          ...upsertAssetVersion(asset, creativeImage.prompt, {
            format: "image",
            imageUrl: creativeImage.imageUrl,
            provenance: ["Producer", "Design Director", "Judge"],
            prompt: creativeImage.prompt,
          }),
          imageUrl: creativeImage.imageUrl,
          prompt: creativeImage.prompt,
        };
      }),
    };
  }

  static buildAssetBundle(
    workspace: OrganizationWorkspace,
    brief: CampaignBrief,
    shareUrl?: string,
    provider?: string,
  ): AssetBundle {
    const bundleAssetTypes: LocalGrowthAssetType[] = [
      "localized_landing_page",
      "gbp_post_pack",
      "social_ad_pack",
      "review_response_pack",
      "voiceover_script",
      "creative_prompt",
      "creative_image",
    ];

    const assetIds = workspace.assets
      .filter((asset) => bundleAssetTypes.includes(asset.type) && asset.currentVersionId)
      .map((asset) => asset.id);

    return {
      id: createLocalGrowthId("bundle"),
      title: brief.name || "Campaign bundle",
      briefId: brief.id,
      locationIds: brief.targetLocationIds,
      assetIds,
      shareUrl,
      provider,
      status: shareUrl ? "shared" : "ready",
      updatedAt: Date.now(),
    };
  }

  static async analyzeVoiceBrief(
    workspace: OrganizationWorkspace,
    transcript: string,
    userId?: string,
  ): Promise<Pick<VoiceSession, "transcript" | "generatedScript" | "extractedRequests">> {
    const prompt = `You are Local Growth OS processing an audio marketing brief.

${this.buildWorkspaceSummary(workspace)}

Transcript:
${transcript}

Return strict JSON with this shape:
{
  "extractedRequests": ["request 1", "request 2", "request 3"],
  "generatedScript": "a short promo script that responds to the brief"
}

Rules:
- Extract concrete marketing asks only.
- Keep the promo script usable for a local campaign voiceover.
- Do not invent channels or offers not supported by the brief unless clearly inferred.
- If you infer something, make it conservative.`;

    const response = await AIService.generateConsensusResponse(
      prompt,
      undefined,
      undefined,
      userId,
    );

    if (!response.success) {
      throw new Error(response.error || "Voice brief analysis failed");
    }

    const parsed = extractJsonBlock<{
      extractedRequests?: string[];
      generatedScript?: string;
    }>(response.content);

    if (!parsed?.generatedScript) {
      throw new Error("Voice brief analysis returned an invalid format");
    }

    return {
      transcript,
      generatedScript: parsed.generatedScript,
      extractedRequests: Array.isArray(parsed.extractedRequests)
        ? parsed.extractedRequests.slice(0, 6)
        : [],
    };
  }

  static async generateCopilotMessage(
    workspace: OrganizationWorkspace,
    prompt: string,
    userId?: string,
  ): Promise<Message> {
    const response = await AIService.generateConsensusResponse(
      `You are the Local Growth OS copilot. Use the client brand, locations, market intel, audits, and campaign assets to answer with operator-grade specificity.\n\n${this.buildWorkspaceSummary(
        workspace,
      )}\n\nUser request:\n${prompt}`,
      undefined,
      undefined,
      userId,
    );

    if (!response.success) {
      throw new Error(response.error || "Copilot response failed");
    }

    return {
      id: createLocalGrowthId("message"),
      content: response.content,
      role: "assistant",
      timestamp: Date.now(),
      source: "consensus",
      model: response.contributingModels.join(", "),
    };
  }
}
