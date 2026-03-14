import { AIService } from "./ai-service";
import { ImageGenerationService } from "./image-generation-service";
import type { Message } from "./types";
import {
  createFounderId,
  founderArtifactSections,
  type FounderArtifact,
  type FounderArtifactType,
  type FounderBrief,
  type FounderRehearsalSession,
  type FounderScorecard,
  type FounderWorkspace,
} from "./founder-types";

const backstageRoles = [
  "Researcher",
  "Strategist",
  "Critic",
  "Writer",
  "Judge",
];

const sectionHeadingPattern = /^##\s+([A-Z0-9_]+)\s*$/gm;

function trimBlock(value: string): string {
  return value.replace(/^\s+|\s+$/g, "");
}

function buildBriefSummary(brief: FounderBrief): string {
  return [
    `Startup: ${brief.startupName || "Untitled startup"}`,
    `Tagline: ${brief.tagline || "Not provided"}`,
    `Problem: ${brief.problem || "Not provided"}`,
    `Solution: ${brief.solution || "Not provided"}`,
    `Target customer: ${brief.targetCustomer || "Not provided"}`,
    `Market: ${brief.market || "Not provided"}`,
    `Business model: ${brief.businessModel || "Not provided"}`,
    `Stage: ${brief.stage || "Not provided"}`,
    `Goals: ${brief.goals || "Not provided"}`,
    `Differentiation: ${brief.differentiation || "Not provided"}`,
    `Constraints: ${brief.constraints || "Not provided"}`,
  ].join("\n");
}

function buildEvidenceSummary(workspace: FounderWorkspace): string {
  if (workspace.sources.length === 0) {
    return "No external evidence has been added yet.";
  }

  return workspace.sources
    .slice(0, 10)
    .map((source, index) => {
      const sourceHeader = `Source ${index + 1}: ${source.title} (${source.type}${
        source.provider ? ` via ${source.provider}` : ""
      })`;
      const sourceBody = source.summary || source.content || "No summary available.";
      return `${sourceHeader}\n${sourceBody}`;
    })
    .join("\n\n---\n\n");
}

function buildCurrentArtifactSummary(workspace: FounderWorkspace): string {
  const existing = workspace.artifacts
    .map((artifact) => {
      if (!artifact.currentVersionId) return null;
      const current = artifact.versions.find(
        (version) => version.id === artifact.currentVersionId,
      );
      if (!current?.content) return null;

      return `### ${artifact.title}\n${current.content.slice(0, 900)}`;
    })
    .filter(Boolean);

  return existing.length > 0
    ? existing.join("\n\n")
    : "No startup pack artifacts have been generated yet.";
}

function parseSectionedContent<T extends Record<string, FounderArtifactType>>(
  content: string,
  sectionMap: T,
): Partial<Record<FounderArtifactType, string>> {
  const matches = [...content.matchAll(sectionHeadingPattern)];
  if (matches.length === 0) {
    return {};
  }

  const parsed: Partial<Record<FounderArtifactType, string>> = {};

  matches.forEach((match, index) => {
    const heading = match[1];
    const artifactType = sectionMap[heading];
    if (!artifactType) return;

    const start = match.index! + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index! : content.length;
    const block = trimBlock(content.slice(start, end));
    if (block) parsed[artifactType] = block;
  });

  return parsed;
}

function upsertArtifactVersion(
  artifact: FounderArtifact,
  content: string,
  options?: {
    format?: FounderArtifact["format"];
    confidence?: number;
    imageUrl?: string;
    provenance?: string[];
  },
): FounderArtifact {
  const versionId = createFounderId("artifact-version");
  const createdAt = Date.now();

  return {
    ...artifact,
    status: "ready",
    format: options?.format || artifact.format,
    currentVersionId: versionId,
    updatedAt: createdAt,
    imageUrl: options?.imageUrl ?? artifact.imageUrl,
    lastError: undefined,
    versions: [
      {
        id: versionId,
        createdAt,
        content,
        format: options?.format || artifact.format,
        confidence: options?.confidence,
        provenance: options?.provenance,
      },
      ...artifact.versions,
    ],
  };
}

function markArtifactGenerating(artifact: FounderArtifact): FounderArtifact {
  return {
    ...artifact,
    status: "generating",
    lastError: undefined,
  };
}

function markArtifactError(
  artifact: FounderArtifact,
  errorMessage: string,
): FounderArtifact {
  return {
    ...artifact,
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
    console.error("Failed to parse Founder War Room JSON block:", error);
    return null;
  }
}

export class FounderWarRoomService {
  static createSearchQuery(workspace: FounderWorkspace): string {
    const startupName = workspace.brief.startupName || "startup";
    const market = workspace.brief.market || "software";
    const customer = workspace.brief.targetCustomer || "business teams";
    return `${startupName} ${market} ${customer} market trends competitors founder pain points`;
  }

  static buildWorkspaceSummary(workspace: FounderWorkspace): string {
    return [
      "## Founder Brief",
      buildBriefSummary(workspace.brief),
      "",
      "## Evidence",
      buildEvidenceSummary(workspace),
      "",
      "## Existing Startup Pack",
      buildCurrentArtifactSummary(workspace),
    ].join("\n");
  }

  static async generateStrategyPack(
    workspace: FounderWorkspace,
    userId?: string,
  ): Promise<Record<FounderArtifactType, { content: string; confidence?: number }>> {
    const strategyPrompt = `You are Founder War Room, a backstage AI panel with these roles: ${backstageRoles.join(
      ", ",
    )}.

Your mission is to create a sharp founder strategy pack for a startup pitch.

${this.buildWorkspaceSummary(workspace)}

Instructions:
- Researcher: extract market facts, pains, and competitor patterns from the evidence.
- Strategist: define the wedge, ICP, and positioning.
- Critic: call out weak claims, investor risks, and assumptions.
- Writer: turn the result into concise startup-ready markdown.
- Judge: synthesize the strongest final answer.

Return markdown only. Use these exact section headings and no others:
## PROBLEM_STATEMENT
## ICP_PAIN_POINTS
## COMPETITOR_MATRIX
## POSITIONING_STATEMENT
## GTM_LAUNCH_PLAN

Requirements:
- Keep each section concrete and demo-day ready.
- Use a markdown table for COMPETITOR_MATRIX.
- Make the GTM plan action-oriented for the next 30 days.
- Mention evidence-backed insights where possible.
- Do not mention the backstage roles in the final answer.`;

    const response = await AIService.generateConsensusResponse(
      strategyPrompt,
      undefined,
      undefined,
      userId,
    );

    if (!response.success) {
      throw new Error(response.error || "Strategy pack generation failed");
    }

    const parsed = parseSectionedContent(
      response.content,
      founderArtifactSections.strategy,
    );

    if (Object.keys(parsed).length === 0) {
      throw new Error("Strategy pack response did not contain expected sections");
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([artifactType, content]) => [
        artifactType,
        { content: content as string, confidence: response.confidence },
      ]),
    ) as Record<FounderArtifactType, { content: string; confidence?: number }>;
  }

  static async generateLaunchPack(
    workspace: FounderWorkspace,
    userId?: string,
  ): Promise<Record<FounderArtifactType, { content: string; confidence?: number }>> {
    const launchPrompt = `You are Founder War Room, a backstage AI panel with these roles: ${backstageRoles.join(
      ", ",
    )}.

Your job is to turn this startup into a polished launch kit.

${this.buildWorkspaceSummary(workspace)}

Return markdown only. Use these exact section headings and no others:
## LANDING_PAGE_COPY
## DECK_OUTLINE
## FAQ_OBJECTION_HANDLING
## PITCH_SCRIPT_30
## PITCH_SCRIPT_90
## HERO_VISUAL_PROMPT

Requirements:
- LANDING_PAGE_COPY should include hero, problem, proof, features, social proof, CTA.
- DECK_OUTLINE should be slide-by-slide with crisp bullet points.
- FAQ_OBJECTION_HANDLING should cover both customer and investor objections.
- The pitch scripts should sound live, confident, and human.
- HERO_VISUAL_PROMPT should be a single cinematic prompt for a premium startup hero image.
- Keep everything specific to the brief, not generic SaaS filler.`;

    const response = await AIService.generateConsensusResponse(
      launchPrompt,
      undefined,
      undefined,
      userId,
    );

    if (!response.success) {
      throw new Error(response.error || "Launch kit generation failed");
    }

    const parsed = parseSectionedContent(
      response.content,
      founderArtifactSections.launch,
    );

    if (Object.keys(parsed).length === 0) {
      throw new Error("Launch pack response did not contain expected sections");
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([artifactType, content]) => [
        artifactType,
        { content: content as string, confidence: response.confidence },
      ]),
    ) as Record<FounderArtifactType, { content: string; confidence?: number }>;
  }

  static applyGeneratedArtifacts(
    workspace: FounderWorkspace,
    updates: Record<FounderArtifactType, { content: string; confidence?: number }>,
  ): FounderWorkspace {
    return {
      ...workspace,
      updatedAt: Date.now(),
      artifacts: workspace.artifacts.map((artifact) => {
        const next = updates[artifact.type];
        if (!next?.content) return artifact;

        return upsertArtifactVersion(artifact, next.content, {
          confidence: next.confidence,
          provenance: backstageRoles,
          format: artifact.format,
        });
      }),
    };
  }

  static markArtifactsGenerating(
    workspace: FounderWorkspace,
    artifactTypes: FounderArtifactType[],
  ): FounderWorkspace {
    return {
      ...workspace,
      artifacts: workspace.artifacts.map((artifact) =>
        artifactTypes.includes(artifact.type)
          ? markArtifactGenerating(artifact)
          : artifact,
      ),
    };
  }

  static markArtifactsError(
    workspace: FounderWorkspace,
    artifactTypes: FounderArtifactType[],
    errorMessage: string,
  ): FounderWorkspace {
    return {
      ...workspace,
      updatedAt: Date.now(),
      artifacts: workspace.artifacts.map((artifact) =>
        artifactTypes.includes(artifact.type)
          ? markArtifactError(artifact, errorMessage)
          : artifact,
      ),
    };
  }

  static async generateHeroVisual(
    workspace: FounderWorkspace,
  ): Promise<{ prompt: string; imageUrl: string }> {
    const heroArtifact = workspace.artifacts.find(
      (artifact) => artifact.type === "hero_visual",
    );
    const prompt =
      heroArtifact?.currentVersionId
        ? heroArtifact.versions.find(
            (version) => version.id === heroArtifact.currentVersionId,
          )?.content
        : null;

    const finalPrompt =
      prompt ||
      `Create a premium startup hero visual for ${
        workspace.brief.startupName || "a startup"
      }, focused on ${workspace.brief.solution || workspace.brief.problem}. Use a bold, modern, product-led composition.`;

    const response = await ImageGenerationService.generateImage({
      prompt: finalPrompt,
      model: "openai/dall-e-3",
    });

    if (!response.success || !(response.imageUrl || response.imageData)) {
      throw new Error(response.error || "Image generation failed");
    }

    return {
      prompt: finalPrompt,
      imageUrl:
        response.imageUrl || `data:image/png;base64,${response.imageData}`,
    };
  }

  static applyHeroVisual(
    workspace: FounderWorkspace,
    heroVisual: { prompt: string; imageUrl: string },
  ): FounderWorkspace {
    return {
      ...workspace,
      updatedAt: Date.now(),
      artifacts: workspace.artifacts.map((artifact) => {
        if (artifact.type !== "hero_visual") return artifact;

        return {
          ...upsertArtifactVersion(artifact, heroVisual.prompt, {
            format: "image",
            imageUrl: heroVisual.imageUrl,
            provenance: ["Writer", "Design Director", "Judge"],
          }),
          imageUrl: heroVisual.imageUrl,
          prompt: heroVisual.prompt,
        };
      }),
    };
  }

  static async generateCopilotMessage(
    workspace: FounderWorkspace,
    prompt: string,
    userId?: string,
  ): Promise<Message> {
    const response = await AIService.generateConsensusResponse(
      `You are the Founder War Room copilot. Use the founder brief, evidence, and generated startup pack to answer with investor-grade specificity.\n\n${this.buildWorkspaceSummary(
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
      id: createFounderId("message"),
      content: response.content,
      role: "assistant",
      timestamp: Date.now(),
      source: "consensus",
      model: response.contributingModels.join(", "),
    };
  }

  static async critiquePitch(
    workspace: FounderWorkspace,
    transcript: string,
    userId?: string,
  ): Promise<Pick<FounderRehearsalSession, "critique" | "improvedScript" | "objectionPrompts" | "scorecard">> {
    const critiquePrompt = `You are Founder War Room running a pitch rehearsal review.

${this.buildWorkspaceSummary(workspace)}

Transcript:
${transcript}

Return strict JSON with this shape:
{
  "scorecard": {
    "clarity": 0,
    "differentiation": 0,
    "credibility": 0,
    "brevity": 0,
    "investorReadiness": 0
  },
  "critique": "markdown critique",
  "improvedScript": "better pitch script",
  "objectionPrompts": ["question 1", "question 2", "question 3"]
}

Rules:
- Scores are integers 0-100.
- Critique should include strengths, weak spots, and what to cut.
- Improved script should stay under 90 seconds spoken.
- Objection prompts should sound like investor follow-up questions.`;

    const response = await AIService.generateConsensusResponse(
      critiquePrompt,
      undefined,
      undefined,
      userId,
    );

    if (!response.success) {
      throw new Error(response.error || "Pitch critique failed");
    }

    const parsed = extractJsonBlock<{
      scorecard?: Partial<FounderScorecard>;
      critique?: string;
      improvedScript?: string;
      objectionPrompts?: string[];
    }>(response.content);

    if (!parsed?.critique || !parsed?.improvedScript) {
      throw new Error("Pitch critique returned an invalid format");
    }

    return {
      critique: parsed.critique,
      improvedScript: parsed.improvedScript,
      objectionPrompts: Array.isArray(parsed.objectionPrompts)
        ? parsed.objectionPrompts.slice(0, 5)
        : [],
      scorecard: {
        clarity: parsed.scorecard?.clarity ?? 70,
        differentiation: parsed.scorecard?.differentiation ?? 70,
        credibility: parsed.scorecard?.credibility ?? 70,
        brevity: parsed.scorecard?.brevity ?? 70,
        investorReadiness: parsed.scorecard?.investorReadiness ?? 70,
      },
    };
  }
}
