import { ChangeEvent, FormEvent, type ReactNode, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Globe2,
  Loader2,
  Mic,
  PauseCircle,
  PlayCircle,
  Radar,
  Rocket,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { MessageBubble } from "@/components/MessageBubble";
import { ThemeWrapper } from "@/components/ThemeWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FounderBackendClient } from "@/lib/founder-backend-client";
import { FounderWorkspaceStorage } from "@/lib/founder-storage";
import {
  createEmptyFounderWorkspace,
  createFounderId,
  founderArtifactCatalog,
  founderStageLabels,
  founderStageOrder,
  type FounderArtifact,
  type FounderArtifactType,
  type FounderBrief,
  type FounderRehearsalSession,
  type FounderScorecard,
  type FounderSource,
  type FounderStage,
  type FounderWorkspace,
} from "@/lib/founder-types";
import { FounderWarRoomService } from "@/lib/founder-war-room-service";
import { FirebaseService } from "@/lib/firebase-service";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VectorStore } from "@/lib/vector-store";

const STRATEGY_ARTIFACTS: FounderArtifactType[] = [
  "problem_statement",
  "icp_pain_points",
  "competitor_matrix",
  "positioning_statement",
  "gtm_launch_plan",
];

const LAUNCH_ARTIFACTS: FounderArtifactType[] = [
  "landing_page_copy",
  "deck_outline",
  "faq_objection_handling",
  "pitch_script_30",
  "pitch_script_90",
  "hero_visual",
];

const DEFAULT_SCORECARD: FounderScorecard = {
  clarity: 0,
  differentiation: 0,
  credibility: 0,
  brevity: 0,
  investorReadiness: 0,
};

const BACKSTAGE_AGENTS = [
  { name: "Researcher", detail: "Finds market proof, trends, and competitor signals." },
  { name: "Strategist", detail: "Shapes the wedge, ICP, and go-to-market angle." },
  { name: "Critic", detail: "Stress-tests weak claims and investor objections." },
  { name: "Writer", detail: "Turns analysis into crisp pitch-ready assets." },
  { name: "Judge", detail: "Synthesizes the strongest final answer." },
];

const BOOTSTRAP_TIMEOUT_MS = 6500;

function summarizeText(value: string, limit = 420): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function sortWorkspaces(workspaces: FounderWorkspace[]): FounderWorkspace[] {
  return [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt);
}

function getArtifactContent(artifact?: FounderArtifact): string {
  if (!artifact?.currentVersionId) return "";
  return artifact.versions.find((version) => version.id === artifact.currentVersionId)?.content || "";
}

function mergeSources(existing: FounderSource[], incoming: FounderSource[]): FounderSource[] {
  const merged = new Map<string, FounderSource>();

  [...incoming, ...existing].forEach((source) => {
    const key = source.url || `${source.type}:${source.title}`.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, source);
    }
  });

  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function createDocumentSource(file: File, content: string, documentId?: string): FounderSource {
  const now = Date.now();
  return {
    id: createFounderId("source"),
    type: "document",
    title: file.name,
    summary: summarizeText(content, 380) || "Uploaded document",
    content: content.slice(0, 8000),
    createdAt: now,
    updatedAt: now,
    status: "ready",
    provider: "upload",
    tags: ["evidence", "document"],
    metadata: {
      fileType: file.type || "text/plain",
      fileSize: file.size,
      documentId: documentId || null,
    },
  };
}

function createSearchAnswerSource(answer: string, query: string): FounderSource {
  const now = Date.now();
  return {
    id: createFounderId("source"),
    type: "search",
    title: `Research brief: ${query}`,
    summary: summarizeText(answer, 380),
    content: answer.slice(0, 6000),
    createdAt: now,
    updatedAt: now,
    status: "ready",
    provider: "tavily-answer",
    tags: ["research", "answer"],
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function buildStartupName(workspace: FounderWorkspace, draft: FounderBrief): string {
  return draft.startupName.trim() || workspace.name || "Untitled startup pack";
}

function computeStageProgress(workspace: FounderWorkspace): Record<FounderStage, number> {
  const briefFields = [
    workspace.brief.startupName,
    workspace.brief.problem,
    workspace.brief.solution,
    workspace.brief.targetCustomer,
    workspace.brief.market,
    workspace.brief.goals,
  ];

  const strategyReady = workspace.artifacts.filter(
    (artifact) => STRATEGY_ARTIFACTS.includes(artifact.type) && artifact.status === "ready",
  ).length;

  const launchReady = workspace.artifacts.filter(
    (artifact) => LAUNCH_ARTIFACTS.includes(artifact.type) && artifact.status === "ready",
  ).length;

  return {
    brief: Math.round((briefFields.filter(Boolean).length / briefFields.length) * 100),
    evidence: workspace.sources.length > 0 ? Math.min(100, workspace.sources.length * 18) : 0,
    strategy: Math.round((strategyReady / STRATEGY_ARTIFACTS.length) * 100),
    launch: Math.round((launchReady / LAUNCH_ARTIFACTS.length) * 100),
    rehearsal: workspace.rehearsalSessions.length > 0 ? 100 : 0,
  };
}

function getOverallProgress(workspace: FounderWorkspace): number {
  const metrics = computeStageProgress(workspace);
  const values = founderStageOrder.map((stage) => metrics[stage]);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function createDraftFromWorkspace(workspace: FounderWorkspace): FounderBrief {
  return {
    ...workspace.brief,
  };
}

function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SectionHeader({
  kicker,
  title,
  detail,
  action,
}: {
  kicker: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="section-kicker">{kicker}</div>
        <div className="space-y-1">
          <h2 className="section-title text-2xl sm:text-3xl">{title}</h2>
          <p className="section-subtitle max-w-2xl text-sm sm:text-base">{detail}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <Progress value={value} className="h-2.5 bg-secondary/70" />
    </div>
  );
}

function ArtifactCard({
  artifact,
  onCopy,
}: {
  artifact: FounderArtifact;
  onCopy: (artifact: FounderArtifact) => void;
}) {
  const content = getArtifactContent(artifact);

  return (
    <Card className="page-surface-card gap-4 border-border/70 bg-card/80 py-5">
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{artifact.title}</CardTitle>
            <CardDescription>{artifact.description}</CardDescription>
          </div>
          <Badge
            variant={artifact.status === "ready" ? "secondary" : artifact.status === "error" ? "destructive" : "outline"}
            className="capitalize"
          >
            {artifact.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        {artifact.imageUrl ? (
          <img
            src={artifact.imageUrl}
            alt={artifact.title}
            className="h-48 w-full rounded-2xl border border-border/70 object-cover"
          />
        ) : null}

        {artifact.lastError ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {artifact.lastError}
          </div>
        ) : null}

        {content ? (
          <div className="max-h-[20rem] overflow-y-auto rounded-2xl border border-border/70 bg-background/70 p-4">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
            This artifact has not been generated yet.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{artifact.versions.length} version{artifact.versions.length === 1 ? "" : "s"}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCopy(artifact)}
            disabled={!content}
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FounderWarRoom() {
  const [userId, setUserId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<"local" | "cloud">("local");
  const [workspaces, setWorkspaces] = useState<FounderWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [briefDraft, setBriefDraft] = useState<FounderBrief>(() => createEmptyFounderWorkspace().brief);
  const [searchQuery, setSearchQuery] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [audioFileName, setAudioFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioPreviewObjectUrlRef = useRef<string | null>(null);
  const lastSelectedWorkspaceIdRef = useRef<string | null>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null,
    [activeWorkspaceId, workspaces],
  );

  const stageProgress = activeWorkspace ? computeStageProgress(activeWorkspace) : null;
  const overallProgress = activeWorkspace ? getOverallProgress(activeWorkspace) : 0;
  const readyArtifacts = activeWorkspace?.artifacts.filter((artifact) => artifact.status === "ready").length || 0;
  const latestRehearsal = activeWorkspace?.rehearsalSessions[0];
  const isBusy = Boolean(busyAction);

  const applyWorkspaceSnapshot = useEffectEvent((
    nextWorkspaces: FounderWorkspace[],
    nextActiveWorkspaceId?: string | null,
  ) => {
    const sorted = sortWorkspaces(nextWorkspaces);
    const selectedWorkspace =
      sorted.find((workspace) => workspace.id === nextActiveWorkspaceId) || sorted[0] || null;

    setWorkspaces(sorted);
    setActiveWorkspaceId(selectedWorkspace?.id || null);
    setBriefDraft(
      selectedWorkspace
        ? createDraftFromWorkspace(selectedWorkspace)
        : createEmptyFounderWorkspace().brief,
    );
    setSearchQuery(
      selectedWorkspace ? FounderWarRoomService.createSearchQuery(selectedWorkspace) : "",
    );
    setUrlInput("");
    setCopilotPrompt("");
    lastSelectedWorkspaceIdRef.current = selectedWorkspace?.id || null;
  });

  const createFallbackWorkspace = useEffectEvent((nextUserId: string | null, reason: string) => {
    const workspace = createEmptyFounderWorkspace();
    applyWorkspaceSnapshot([workspace], workspace.id);

    if (nextUserId) {
      void FounderWorkspaceStorage.saveWorkspace(nextUserId, workspace).catch((error) => {
        console.warn(`Failed to persist fallback workspace after ${reason}:`, error);
      });
    }

    return workspace;
  });

  async function persistWorkspace(workspace: FounderWorkspace): Promise<FounderWorkspace> {
    const nextWorkspace = {
      ...workspace,
      updatedAt: workspace.updatedAt || Date.now(),
    };

    setWorkspaces((current) =>
      sortWorkspaces([
        nextWorkspace,
        ...current.filter((item) => item.id !== nextWorkspace.id),
      ]),
    );
    setActiveWorkspaceId(nextWorkspace.id);

    if (userId) {
      await FounderWorkspaceStorage.saveWorkspace(userId, nextWorkspace);
    }

    return nextWorkspace;
  }

  function withDraft(workspace: FounderWorkspace): FounderWorkspace {
    return {
      ...workspace,
      name: buildStartupName(workspace, briefDraft),
      brief: { ...briefDraft },
      updatedAt: Date.now(),
    };
  }

  function replaceAudioPreview(url: string) {
    if (audioPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(audioPreviewObjectUrlRef.current);
    }
    audioPreviewObjectUrlRef.current = url;
    setAudioPreviewUrl(url);
  }

  async function copyText(value: string, label: string) {
    if (!value.trim()) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  }

  async function handleCreateWorkspace() {
    const workspace = createEmptyFounderWorkspace();
    setBriefDraft(createDraftFromWorkspace(workspace));
    setSearchQuery(FounderWarRoomService.createSearchQuery(workspace));
    setUrlInput("");
    setCopilotPrompt("");
    await persistWorkspace(workspace);
  }

  async function handleDeleteWorkspace(workspaceId: string) {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;

    if (!window.confirm(`Delete "${workspace.brief.startupName || workspace.name}"?`)) {
      return;
    }

    const remaining = workspaces.filter((item) => item.id !== workspaceId);
    setWorkspaces(sortWorkspaces(remaining));

    if (userId) {
      await FounderWorkspaceStorage.deleteWorkspace(userId, workspaceId);
    }

    if (remaining.length === 0) {
      await handleCreateWorkspace();
      return;
    }

    setActiveWorkspaceId(remaining[0].id);
    setBriefDraft(createDraftFromWorkspace(remaining[0]));
  }

  async function jumpToStage(stage: FounderStage) {
    if (!activeWorkspace) return;

    await persistWorkspace({
      ...withDraft(activeWorkspace),
      stage,
      updatedAt: Date.now(),
    });

    document.getElementById(`stage-${stage}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function saveBrief(event?: FormEvent) {
    event?.preventDefault();
    if (!activeWorkspace) return;

    await persistWorkspace({
      ...withDraft(activeWorkspace),
      stage: "evidence",
      updatedAt: Date.now(),
    });

    toast.success("Founder brief saved");
  }

  async function runResearchFrom(workspace: FounderWorkspace, queryText: string): Promise<FounderWorkspace> {
    const trimmedQuery = queryText.trim() || FounderWarRoomService.createSearchQuery(workspace);
    const response = await FounderBackendClient.searchMarketEvidence(
      trimmedQuery,
      FounderWarRoomService.buildWorkspaceSummary(workspace),
    );

    const incoming = [...response.results];
    if (response.answer?.trim()) {
      incoming.unshift(createSearchAnswerSource(response.answer.trim(), trimmedQuery));
    }

    const nextWorkspace = {
      ...workspace,
      stage: "evidence" as const,
      updatedAt: Date.now(),
      sources: mergeSources(workspace.sources, incoming),
    };

    setSearchQuery(trimmedQuery);
    await persistWorkspace(nextWorkspace);
    toast.success(`Research board updated with ${incoming.length} source${incoming.length === 1 ? "" : "s"}`);
    return nextWorkspace;
  }

  async function ingestUrlFrom(workspace: FounderWorkspace, rawUrl: string): Promise<FounderWorkspace> {
    const response = await FounderBackendClient.ingestUrl(rawUrl.trim());
    const nextWorkspace = {
      ...workspace,
      stage: "evidence" as const,
      updatedAt: Date.now(),
      sources: mergeSources(workspace.sources, [response.source]),
    };

    setUrlInput("");
    await persistWorkspace(nextWorkspace);
    toast.success("URL captured into evidence");
    return nextWorkspace;
  }

  async function generateStrategyFrom(workspace: FounderWorkspace): Promise<FounderWorkspace> {
    const generatingWorkspace = {
      ...FounderWarRoomService.markArtifactsGenerating(workspace, STRATEGY_ARTIFACTS),
      stage: "strategy" as const,
      updatedAt: Date.now(),
    };

    await persistWorkspace(generatingWorkspace);
    const updates = await FounderWarRoomService.generateStrategyPack(generatingWorkspace, userId || undefined);

    const nextWorkspace = {
      ...FounderWarRoomService.applyGeneratedArtifacts(generatingWorkspace, updates),
      stage: "strategy" as const,
      updatedAt: Date.now(),
    };

    await persistWorkspace(nextWorkspace);
    return nextWorkspace;
  }

  async function generateLaunchFrom(workspace: FounderWorkspace): Promise<FounderWorkspace> {
    const generatingWorkspace = {
      ...FounderWarRoomService.markArtifactsGenerating(workspace, LAUNCH_ARTIFACTS),
      stage: "launch" as const,
      updatedAt: Date.now(),
    };

    await persistWorkspace(generatingWorkspace);
    const updates = await FounderWarRoomService.generateLaunchPack(generatingWorkspace, userId || undefined);

    const nextWorkspace = {
      ...FounderWarRoomService.applyGeneratedArtifacts(generatingWorkspace, updates),
      stage: "launch" as const,
      updatedAt: Date.now(),
    };

    await persistWorkspace(nextWorkspace);
    return nextWorkspace;
  }

  async function generateHeroFrom(workspace: FounderWorkspace): Promise<FounderWorkspace> {
    const generatingWorkspace = {
      ...FounderWarRoomService.markArtifactsGenerating(workspace, ["hero_visual"]),
      stage: "launch" as const,
      updatedAt: Date.now(),
    };

    await persistWorkspace(generatingWorkspace);
    const heroVisual = await FounderWarRoomService.generateHeroVisual(generatingWorkspace);
    const nextWorkspace = {
      ...FounderWarRoomService.applyHeroVisual(generatingWorkspace, heroVisual),
      stage: "launch" as const,
      updatedAt: Date.now(),
    };

    await persistWorkspace(nextWorkspace);
    return nextWorkspace;
  }

  async function handleRunResearch(event?: FormEvent) {
    event?.preventDefault();
    if (!activeWorkspace || isBusy) return;

    setBusyAction("Running market research");
    try {
      await runResearchFrom(withDraft(activeWorkspace), searchQuery);
    } catch (error) {
      console.error("Research failed:", error);
      toast.error(error instanceof Error ? error.message : "Market research failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleIngestUrl(event?: FormEvent) {
    event?.preventDefault();
    if (!activeWorkspace || !urlInput.trim() || isBusy) return;

    setBusyAction("Ingesting URL");
    try {
      await ingestUrlFrom(withDraft(activeWorkspace), urlInput);
    } catch (error) {
      console.error("URL ingest failed:", error);
      toast.error(error instanceof Error ? error.message : "URL ingest failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDocumentUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!activeWorkspace || files.length === 0 || isBusy) return;

    setBusyAction("Uploading evidence");
    let workingWorkspace = withDraft(activeWorkspace);

    try {
      for (const file of files) {
        setUploadLabel(file.name);
        setUploadProgress(8);
        const content = await file.text();
        let documentId: string | undefined;

        if (userId) {
          documentId = await VectorStore.processDocument(
            userId,
            content,
            {
              filename: file.name,
              type: file.type || "text/plain",
              size: file.size,
            },
            (progress) => setUploadProgress(Math.max(8, Math.round(progress * 100))),
          );
        }

        workingWorkspace = {
          ...workingWorkspace,
          stage: "evidence",
          updatedAt: Date.now(),
          sources: mergeSources(workingWorkspace.sources, [
            createDocumentSource(file, content, documentId),
          ]),
        };

        await persistWorkspace(workingWorkspace);
      }

      toast.success(`Added ${files.length} evidence document${files.length === 1 ? "" : "s"}`);
    } catch (error) {
      console.error("Document upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Document upload failed");
    } finally {
      setBusyAction(null);
      setUploadLabel("");
      setUploadProgress(0);
    }
  }

  async function handleGenerateStrategy() {
    if (!activeWorkspace || isBusy) return;

    setBusyAction("Generating strategy board");
    try {
      await generateStrategyFrom(withDraft(activeWorkspace));
      toast.success("Strategy board ready");
    } catch (error) {
      console.error("Strategy generation failed:", error);
      toast.error(error instanceof Error ? error.message : "Strategy generation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateLaunch() {
    if (!activeWorkspace || isBusy) return;

    setBusyAction("Generating launch kit");
    try {
      await generateLaunchFrom(withDraft(activeWorkspace));
      toast.success("Launch kit drafted");
    } catch (error) {
      console.error("Launch generation failed:", error);
      toast.error(error instanceof Error ? error.message : "Launch kit generation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateHeroVisual() {
    if (!activeWorkspace || isBusy) return;

    setBusyAction("Generating hero visual");
    try {
      await generateHeroFrom(withDraft(activeWorkspace));
      toast.success("Hero visual generated");
    } catch (error) {
      console.error("Hero visual generation failed:", error);
      toast.error(error instanceof Error ? error.message : "Hero visual generation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function buildStartupPack() {
    if (!activeWorkspace || isBusy) return;

    setBusyAction("Building startup pack");
    try {
      let workingWorkspace = withDraft(activeWorkspace);
      await persistWorkspace(workingWorkspace);

      if (workingWorkspace.sources.length === 0) {
        try {
          workingWorkspace = await runResearchFrom(workingWorkspace, searchQuery);
        } catch (error) {
          console.warn("Research failed during startup pack build:", error);
          toast.error("Research lookup failed. Continuing with the founder brief only.");
        }
      }

      workingWorkspace = await generateStrategyFrom(workingWorkspace);
      workingWorkspace = await generateLaunchFrom(workingWorkspace);

      try {
        await generateHeroFrom(workingWorkspace);
      } catch (error) {
        console.warn("Hero image generation failed during startup pack build:", error);
        toast.error("Hero visual failed. The rest of the startup pack is ready.");
      }

      toast.success("Founder War Room delivered a startup pack");
    } catch (error) {
      console.error("Startup pack build failed:", error);
      toast.error(error instanceof Error ? error.message : "Startup pack build failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function exportWorkspace() {
    if (!activeWorkspace) return;

    setBusyAction("Exporting markdown");
    try {
      let markdown = "";

      try {
        markdown = (await FounderBackendClient.exportWorkspace(withDraft(activeWorkspace))).markdown;
      } catch (error) {
        console.warn("Backend export failed, using local export:", error);
        markdown = FounderWorkspaceStorage.exportWorkspaceMarkdown(withDraft(activeWorkspace));
      }

      const slug = (activeWorkspace.brief.startupName || activeWorkspace.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "founder-war-room";

      downloadMarkdownFile(`${slug}-startup-pack.md`, markdown);
      toast.success("Startup pack exported");
    } finally {
      setBusyAction(null);
    }
  }

  async function sendCopilotMessage(event?: FormEvent) {
    event?.preventDefault();
    if (!activeWorkspace || !copilotPrompt.trim() || isBusy) return;

    const prompt = copilotPrompt.trim();
    const userMessage: Message = {
      id: createFounderId("message"),
      content: prompt,
      role: "user",
      timestamp: Date.now(),
    };

    setBusyAction("Consulting founder copilot");
    setIsCopilotOpen(true);
    setCopilotPrompt("");

    const workingWorkspace = {
      ...withDraft(activeWorkspace),
      updatedAt: Date.now(),
      copilotMessages: [...activeWorkspace.copilotMessages, userMessage],
    };

    await persistWorkspace(workingWorkspace);

    try {
      const reply = await FounderWarRoomService.generateCopilotMessage(
        workingWorkspace,
        prompt,
        userId || undefined,
      );

      await persistWorkspace({
        ...workingWorkspace,
        updatedAt: Date.now(),
        copilotMessages: [...workingWorkspace.copilotMessages, reply],
      });
    } catch (error) {
      console.error("Copilot failed:", error);
      await persistWorkspace({
        ...workingWorkspace,
        updatedAt: Date.now(),
        copilotMessages: [
          ...workingWorkspace.copilotMessages,
          {
            id: createFounderId("message"),
            content: error instanceof Error ? error.message : "Copilot request failed",
            role: "assistant",
            timestamp: Date.now(),
            source: "system",
          },
        ],
      });
      toast.error(error instanceof Error ? error.message : "Copilot request failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function startRecording() {
    if (isBusy || isRecording) return;

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Audio recording is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const fileName = `pitch-${Date.now()}.webm`;
        const file = new File([new Blob(chunks, { type })], fileName, { type });
        replaceAudioPreview(URL.createObjectURL(file));
        setAudioDataUrl(await readAsDataUrl(file));
        setAudioFileName(file.name);
        setIsRecording(false);

        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Recording failed:", error);
      toast.error("Microphone access was denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function handleAudioUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    replaceAudioPreview(URL.createObjectURL(file));
    setAudioDataUrl(await readAsDataUrl(file));
    setAudioFileName(file.name);
    toast.success("Pitch audio ready");
  }

  async function runRehearsal() {
    if (!activeWorkspace || !audioDataUrl || isBusy) return;

    const sessionId = createFounderId("rehearsal");
    const now = Date.now();
    const pendingSession: FounderRehearsalSession = {
      id: sessionId,
      createdAt: now,
      updatedAt: now,
      transcript: "",
      critique: "",
      improvedScript: "",
      objectionPrompts: [],
      status: "processing",
      scorecard: DEFAULT_SCORECARD,
    };

    let workingWorkspace = {
      ...withDraft(activeWorkspace),
      stage: "rehearsal" as const,
      updatedAt: now,
      rehearsalSessions: [pendingSession, ...activeWorkspace.rehearsalSessions],
    };

    setBusyAction("Running pitch rehearsal");
    await persistWorkspace(workingWorkspace);

    try {
      const transcription = await FounderBackendClient.transcribePitch(audioDataUrl, audioFileName);
      const critique = await FounderWarRoomService.critiquePitch(
        workingWorkspace,
        transcription.transcript,
        userId || undefined,
      );

      let polishedAudioUrl: string | undefined;
      try {
        const synth = await FounderBackendClient.synthesizePitch(critique.improvedScript);
        polishedAudioUrl = synth.audioDataUrl.length < 240000 ? synth.audioDataUrl : undefined;
      } catch (error) {
        console.warn("Voice synthesis failed:", error);
      }

      const readySession: FounderRehearsalSession = {
        ...pendingSession,
        ...critique,
        transcript: transcription.transcript,
        polishedAudioUrl,
        status: "ready",
        updatedAt: Date.now(),
      };

      workingWorkspace = {
        ...workingWorkspace,
        updatedAt: readySession.updatedAt,
        rehearsalSessions: [
          readySession,
          ...workingWorkspace.rehearsalSessions.filter((session) => session.id !== sessionId),
        ],
      };

      await persistWorkspace(workingWorkspace);
      toast.success("Pitch rehearsal complete");
    } catch (error) {
      const failedSession: FounderRehearsalSession = {
        ...pendingSession,
        status: "error",
        error: error instanceof Error ? error.message : "Pitch rehearsal failed",
        updatedAt: Date.now(),
      };

      workingWorkspace = {
        ...workingWorkspace,
        updatedAt: failedSession.updatedAt,
        rehearsalSessions: [
          failedSession,
          ...workingWorkspace.rehearsalSessions.filter((session) => session.id !== sessionId),
        ],
      };

      await persistWorkspace(workingWorkspace);
      toast.error(error instanceof Error ? error.message : "Pitch rehearsal failed");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setIsHydrating(true);
      let uid: string | null = null;

      try {
        await withTimeout(
          FirebaseService.initialize(),
          BOOTSTRAP_TIMEOUT_MS,
          "Founder bootstrap",
        );
        uid = await withTimeout(
          FirebaseService.getCurrentUserId(),
          BOOTSTRAP_TIMEOUT_MS,
          "Founder session bootstrap",
        );
      } catch (error) {
        console.warn("Founder bootstrap fell back to local mode:", error);
        uid = FirebaseService.getOrCreateLocalSessionId();
      }

      if (cancelled) return;

      setUserId(uid);
      setStorageMode(FirebaseService.getStorageMode());

      let loaded: FounderWorkspace[] = [];

      if (uid) {
        try {
          loaded = await withTimeout(
            FounderWorkspaceStorage.listWorkspaces(uid),
            BOOTSTRAP_TIMEOUT_MS,
            "Founder workspace restore",
          );
        } catch (error) {
          console.warn("Founder workspace restore failed, using fallback workspace:", error);
        }
      }

      if (cancelled) return;

      if (loaded.length === 0) {
        createFallbackWorkspace(uid, "bootstrap");
      } else {
        applyWorkspaceSnapshot(loaded, loaded[0].id);
      }

      setIsHydrating(false);
    };

    initialize().catch((error) => {
      console.error("Founder War Room init failed:", error);
      toast.error("Failed to initialize Founder War Room");
      const fallbackUserId = FirebaseService.getOrCreateLocalSessionId();

      if (!cancelled) {
        setUserId(fallbackUserId);
        setStorageMode("local");
        createFallbackWorkspace(fallbackUserId, "initialization failure");
      }

      setIsHydrating(false);
    });

    return () => {
      cancelled = true;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(audioPreviewObjectUrlRef.current);
      }
    };
  }, [applyWorkspaceSnapshot, createFallbackWorkspace]);

  useEffect(() => {
    if (isHydrating || activeWorkspace) return;

    if (workspaces.length > 0) {
      const recoveredWorkspace = sortWorkspaces(workspaces)[0];
      applyWorkspaceSnapshot(workspaces, recoveredWorkspace.id);
      return;
    }

    const fallbackUserId = userId || FirebaseService.getOrCreateLocalSessionId();
    setUserId(fallbackUserId);
    setStorageMode("local");
    createFallbackWorkspace(fallbackUserId, "workspace recovery");
  }, [activeWorkspace, applyWorkspaceSnapshot, createFallbackWorkspace, isHydrating, userId, workspaces]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (lastSelectedWorkspaceIdRef.current === activeWorkspaceId) return;

    const nextWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
    if (!nextWorkspace) return;

    lastSelectedWorkspaceIdRef.current = activeWorkspaceId;
    setBriefDraft(createDraftFromWorkspace(nextWorkspace));
    setSearchQuery(FounderWarRoomService.createSearchQuery(nextWorkspace));
    setUrlInput("");
  }, [activeWorkspaceId, workspaces]);

  if (isHydrating || !activeWorkspace || !stageProgress) {
    return (
      <ThemeWrapper>
        <div className="min-h-screen app-shell-gradient text-foreground">
          <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
            <Card className="page-surface-card w-full max-w-xl border-border/70 bg-card/85 py-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Founder War Room
                </CardTitle>
                <CardDescription>
                  Loading your founder workspace, evidence board, and startup pack artifacts.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <Toaster position="top-center" />
        </div>
      </ThemeWrapper>
    );
  }

  return (
    <ThemeWrapper>
      <div className="min-h-screen app-shell-gradient text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="surface-enter rounded-[2rem] border border-border/70 bg-card/75 p-5 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.45)] backdrop-blur sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/90 text-primary-foreground">Founder War Room</Badge>
                  <Badge variant="outline">Pitch Copilot</Badge>
                  <Badge variant="outline">{storageMode === "cloud" ? "Firebase sync on" : "Local-first mode"}</Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="section-title text-4xl tracking-tight sm:text-5xl">
                    Brief in. Evidence in. Deck out.
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Founder War Room turns one startup brief into market research, strategy, launch assets,
                    and a scored pitch rehearsal loop without exposing provider complexity.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <ThemeToggle />
                <Button type="button" variant="outline" onClick={handleCreateWorkspace}>
                  <Rocket className="h-4 w-4" />
                  New Workspace
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr,0.8fr]">
              <div className="rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-primary/12 via-background/80 to-accent/12 p-5 sm:p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-4">
                    <div className="section-kicker">Single CTA</div>
                    <div className="space-y-2">
                      <h2 className="section-title text-2xl sm:text-3xl">Build My Startup Pack</h2>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        Generate the evidence board, strategy, launch kit, and pitch rehearsal loop in one guided path.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{activeWorkspace.sources.length} evidence sources</Badge>
                      <Badge variant="secondary">{readyArtifacts} artifacts ready</Badge>
                      <Badge variant="secondary">{activeWorkspace.rehearsalSessions.length} rehearsal sessions</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="button" size="lg" onClick={buildStartupPack} disabled={isBusy}>
                      {isBusy && busyAction === "Building startup pack" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {busyAction === "Building startup pack" ? busyAction : "Build My Startup Pack"}
                    </Button>
                    <Button type="button" size="lg" variant="outline" onClick={exportWorkspace} disabled={isBusy}>
                      <Download className="h-4 w-4" />
                      Export Markdown
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-border/70 bg-background/65 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Workflow progress</span>
                  <span className="text-muted-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="mt-3 h-3 bg-secondary/60" />

                <div className="mt-5 grid gap-2">
                  {founderStageOrder.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => jumpToStage(stage)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                        activeWorkspace.stage === stage
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/70 bg-card/55 hover:border-primary/30 hover:bg-primary/5",
                      )}
                    >
                      <div>
                        <div className="font-medium">{founderStageLabels[stage]}</div>
                        <div className="text-xs text-muted-foreground">{stageProgress[stage]}% complete</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-[300px,minmax(0,1fr)]">
            <aside className="surface-enter surface-enter-delay-1 space-y-6">
              <Card className="page-surface-card border-border/70 bg-card/80 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="text-lg">Workspaces</CardTitle>
                  <CardDescription>Switch between startup packs without leaving the guided flow.</CardDescription>
                </CardHeader>
                <CardContent className="px-5">
                  <ScrollArea className="h-[20rem] pr-3">
                    <div className="space-y-3">
                      {workspaces.map((workspace) => (
                        <div
                          key={workspace.id}
                          className={cn(
                            "rounded-2xl border p-4 transition",
                            workspace.id === activeWorkspaceId
                              ? "border-primary/40 bg-primary/10"
                              : "border-border/70 bg-background/60 hover:border-primary/25 hover:bg-primary/5",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveWorkspaceId(workspace.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="font-medium">{workspace.brief.startupName || workspace.name}</div>
                                <div className="line-clamp-2 text-xs text-muted-foreground">
                                  {workspace.brief.tagline || workspace.brief.problem || "No brief yet"}
                                </div>
                              </div>
                              <Badge variant="outline">{getOverallProgress(workspace)}%</Badge>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">Updated {formatDate(workspace.updatedAt)}</div>
                          </button>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <Badge variant="secondary">{founderStageLabels[workspace.stage]}</Badge>
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteWorkspace(workspace.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="page-surface-card border-border/70 bg-card/80 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="text-lg">Backstage Agents</CardTitle>
                  <CardDescription>The models stay backstage. The workflow stays simple.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5">
                  {BACKSTAGE_AGENTS.map((agent) => (
                    <div key={agent.name} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <div className="font-medium">{agent.name}</div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{agent.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>

            <main className="surface-enter surface-enter-delay-2 space-y-6">
              <section id="stage-brief">
                <Card className="page-surface-card border-border/70 bg-card/85 py-6">
                  <CardHeader className="px-6">
                    <SectionHeader
                      kicker="Stage 1"
                      title="Founder Brief"
                      detail="Capture the company narrative once. Everything else in the war room derives from this."
                      action={
                        <Button type="button" onClick={() => void saveBrief()} disabled={isBusy}>
                          <Target className="h-4 w-4" />
                          Save Brief
                        </Button>
                      }
                    />
                  </CardHeader>
                  <CardContent className="space-y-5 px-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        value={briefDraft.startupName}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, startupName: event.target.value }))}
                        placeholder="Startup name"
                      />
                      <Input
                        value={briefDraft.tagline}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, tagline: event.target.value }))}
                        placeholder="One-line tagline"
                      />
                      <Input
                        value={briefDraft.market}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, market: event.target.value }))}
                        placeholder="Market"
                      />
                      <Input
                        value={briefDraft.targetCustomer}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, targetCustomer: event.target.value }))}
                        placeholder="Target customer"
                      />
                      <Input
                        value={briefDraft.businessModel}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, businessModel: event.target.value }))}
                        placeholder="Business model"
                      />
                      <Input
                        value={briefDraft.stage}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, stage: event.target.value }))}
                        placeholder="Company stage"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Textarea
                        value={briefDraft.problem}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, problem: event.target.value }))}
                        placeholder="What painful problem exists?"
                        className="min-h-32"
                      />
                      <Textarea
                        value={briefDraft.solution}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, solution: event.target.value }))}
                        placeholder="How does the product solve it?"
                        className="min-h-32"
                      />
                      <Textarea
                        value={briefDraft.goals}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, goals: event.target.value }))}
                        placeholder="What should this startup pack help you achieve?"
                        className="min-h-28"
                      />
                      <Textarea
                        value={briefDraft.differentiation}
                        onChange={(event) => setBriefDraft((current) => ({ ...current, differentiation: event.target.value }))}
                        placeholder="Why is this different or hard to copy?"
                        className="min-h-28"
                      />
                    </div>

                    <Textarea
                      value={briefDraft.constraints}
                      onChange={(event) => setBriefDraft((current) => ({ ...current, constraints: event.target.value }))}
                      placeholder="Constraints, non-negotiables, regulatory issues, or demo limits"
                      className="min-h-24"
                    />
                  </CardContent>
                </Card>
              </section>

              <section id="stage-evidence">
                <Card className="page-surface-card border-border/70 bg-card/85 py-6">
                  <CardHeader className="px-6">
                    <SectionHeader
                      kicker="Stage 2"
                      title="Evidence Board"
                      detail="Blend uploads, URLs, and live market research into one source-backed context board."
                      action={
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => void handleRunResearch()} disabled={isBusy}>
                            <Search className="h-4 w-4" />
                            Research
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void handleIngestUrl()} disabled={isBusy || !urlInput.trim()}>
                            <Globe2 className="h-4 w-4" />
                            Ingest URL
                          </Button>
                        </div>
                      }
                    />
                  </CardHeader>
                  <CardContent className="space-y-5 px-6">
                    <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
                      <form onSubmit={handleRunResearch} className="rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Radar className="h-4 w-4 text-primary" />
                          Market research
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Search across the web for proof, trends, and competitor signals.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="AI insurance workflow automation market trends"
                          />
                          <Button type="submit" disabled={isBusy}>
                            <Search className="h-4 w-4" />
                            Run
                          </Button>
                        </div>
                      </form>

                      <form onSubmit={handleIngestUrl} className="rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                          URL capture
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Pull in target competitors, docs, or category pages as structured evidence.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <Input
                            value={urlInput}
                            onChange={(event) => setUrlInput(event.target.value)}
                            placeholder="https://example.com"
                          />
                          <Button type="submit" disabled={isBusy || !urlInput.trim()}>
                            <Globe2 className="h-4 w-4" />
                            Capture
                          </Button>
                        </div>
                      </form>
                    </div>

                    <div className="rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Upload className="h-4 w-4 text-primary" />
                            Upload evidence documents
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Text and markdown uploads are saved as evidence and added to the existing knowledge store.
                          </p>
                        </div>
                        <label className="inline-flex">
                          <input
                            type="file"
                            accept=".txt,.md,.markdown,text/plain,text/markdown"
                            multiple
                            onChange={handleDocumentUpload}
                            className="hidden"
                          />
                          <Button type="button" variant="outline" disabled={isBusy} asChild>
                            <span>
                              <FileText className="h-4 w-4" />
                              Upload Docs
                            </span>
                          </Button>
                        </label>
                      </div>

                      {uploadLabel ? (
                        <div className="mt-4 space-y-2">
                          <div className="text-sm text-muted-foreground">Uploading {uploadLabel}</div>
                          <Progress value={uploadProgress} className="h-2.5 bg-secondary/70" />
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {activeWorkspace.sources.length > 0 ? (
                        activeWorkspace.sources.map((source) => (
                          <Card key={source.id} className="page-surface-card gap-4 border-border/70 bg-card/75 py-5">
                            <CardHeader className="px-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="text-base">{source.title}</CardTitle>
                                  <CardDescription>{source.provider || source.type}</CardDescription>
                                </div>
                                <Badge variant="outline" className="capitalize">
                                  {source.type}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4 px-5">
                              <p className="text-sm text-muted-foreground">{source.summary || "No summary available"}</p>
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                                >
                                  Open source
                                  <ArrowUpRight className="h-4 w-4" />
                                </a>
                              ) : null}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="rounded-[1.75rem] border border-dashed border-border/80 bg-background/55 px-5 py-10 text-center text-sm text-muted-foreground lg:col-span-2">
                          No evidence yet. Start with the generated research query, a competitor URL, or a product brief upload.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section id="stage-strategy">
                <Card className="page-surface-card border-border/70 bg-card/85 py-6">
                  <CardHeader className="px-6">
                    <SectionHeader
                      kicker="Stage 3"
                      title="Strategy Board"
                      detail="Run the Researcher, Strategist, Critic, Writer, and Judge pipeline against the brief and evidence."
                      action={
                        <Button type="button" onClick={handleGenerateStrategy} disabled={isBusy}>
                          <BrainCircuit className="h-4 w-4" />
                          Generate Strategy
                        </Button>
                      }
                    />
                  </CardHeader>
                  <CardContent className="grid gap-4 px-6 lg:grid-cols-2">
                    {founderArtifactCatalog
                      .filter((artifact) => STRATEGY_ARTIFACTS.includes(artifact.type))
                      .map((artifactDefinition) => (
                        <ArtifactCard
                          key={artifactDefinition.type}
                          artifact={activeWorkspace.artifacts.find((artifact) => artifact.type === artifactDefinition.type)!}
                          onCopy={(artifact) => void copyText(getArtifactContent(artifact), artifact.title)}
                        />
                      ))}
                  </CardContent>
                </Card>
              </section>

              <section id="stage-launch">
                <Card className="page-surface-card border-border/70 bg-card/85 py-6">
                  <CardHeader className="px-6">
                    <SectionHeader
                      kicker="Stage 4"
                      title="Launch Kit"
                      detail="Turn strategy into a landing page, deck outline, objection handling, pitch scripts, and a premium hero visual."
                      action={
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" onClick={handleGenerateLaunch} disabled={isBusy}>
                            <WandSparkles className="h-4 w-4" />
                            Generate Launch Kit
                          </Button>
                          <Button type="button" variant="outline" onClick={handleGenerateHeroVisual} disabled={isBusy}>
                            <Sparkles className="h-4 w-4" />
                            Hero Visual
                          </Button>
                        </div>
                      }
                    />
                  </CardHeader>
                  <CardContent className="grid gap-4 px-6 lg:grid-cols-2">
                    {founderArtifactCatalog
                      .filter((artifact) => LAUNCH_ARTIFACTS.includes(artifact.type))
                      .map((artifactDefinition) => (
                        <ArtifactCard
                          key={artifactDefinition.type}
                          artifact={activeWorkspace.artifacts.find((artifact) => artifact.type === artifactDefinition.type)!}
                          onCopy={(artifact) => void copyText(getArtifactContent(artifact), artifact.title)}
                        />
                      ))}
                  </CardContent>
                </Card>
              </section>

              <section id="stage-rehearsal">
                <Card className="page-surface-card border-border/70 bg-card/85 py-6">
                  <CardHeader className="px-6">
                    <SectionHeader
                      kicker="Stage 5"
                      title="Pitch Rehearsal"
                      detail="Upload or record a short pitch, score it for clarity and investor readiness, then get an improved version back."
                      action={
                        <Button type="button" onClick={runRehearsal} disabled={isBusy || !audioDataUrl}>
                          <Mic className="h-4 w-4" />
                          Run Rehearsal
                        </Button>
                      }
                    />
                  </CardHeader>
                  <CardContent className="space-y-5 px-6">
                    <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                      <div className="rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
                        <div className="flex flex-wrap gap-3">
                          <Button type="button" variant={isRecording ? "secondary" : "default"} onClick={isRecording ? stopRecording : startRecording} disabled={isBusy}>
                            {isRecording ? <PauseCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            {isRecording ? "Stop Recording" : "Record Pitch"}
                          </Button>

                          <label className="inline-flex">
                            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                            <Button type="button" variant="outline" disabled={isBusy} asChild>
                              <span>
                                <Upload className="h-4 w-4" />
                                Upload Audio
                              </span>
                            </Button>
                          </label>
                        </div>

                        <div className="mt-4 rounded-2xl border border-border/70 bg-card/70 p-4">
                          <div className="text-sm font-medium">{audioFileName || "No pitch audio selected"}</div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Record a quick founder pitch or upload an existing take for critique.
                          </p>
                          {audioPreviewUrl ? (
                            <audio controls className="mt-4 w-full">
                              <source src={audioPreviewUrl} />
                            </audio>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
                        <div className="text-sm font-medium">Latest scorecard</div>
                        <div className="mt-4 space-y-4">
                          <ScoreBar label="Clarity" value={latestRehearsal?.scorecard.clarity || 0} />
                          <ScoreBar label="Differentiation" value={latestRehearsal?.scorecard.differentiation || 0} />
                          <ScoreBar label="Credibility" value={latestRehearsal?.scorecard.credibility || 0} />
                          <ScoreBar label="Brevity" value={latestRehearsal?.scorecard.brevity || 0} />
                          <ScoreBar label="Investor readiness" value={latestRehearsal?.scorecard.investorReadiness || 0} />
                        </div>
                      </div>
                    </div>

                    {latestRehearsal ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="page-surface-card gap-4 border-border/70 bg-card/75 py-5">
                          <CardHeader className="px-5">
                            <CardTitle className="text-base">Transcript</CardTitle>
                            <CardDescription>What the model heard from your latest pitch take.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 px-5">
                            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                              {latestRehearsal.transcript || latestRehearsal.error || "Transcript unavailable."}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => void copyText(latestRehearsal.transcript || "", "Transcript")}>
                              <Copy className="h-4 w-4" />
                              Copy Transcript
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="page-surface-card gap-4 border-border/70 bg-card/75 py-5">
                          <CardHeader className="px-5">
                            <CardTitle className="text-base">Improved Script</CardTitle>
                            <CardDescription>The revised pitch after critique and compression.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 px-5">
                            <div className="max-h-[20rem] overflow-y-auto rounded-2xl border border-border/70 bg-background/70 p-4">
                              <MarkdownRenderer content={latestRehearsal.improvedScript || "No improved script yet."} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => void copyText(latestRehearsal.improvedScript || "", "Improved script")}>
                                <Copy className="h-4 w-4" />
                                Copy Script
                              </Button>
                              {latestRehearsal.polishedAudioUrl ? (
                                <Button type="button" size="sm" variant="outline" onClick={() => window.open(latestRehearsal.polishedAudioUrl, "_blank")}>
                                  <PlayCircle className="h-4 w-4" />
                                  Open Voice
                                </Button>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="page-surface-card gap-4 border-border/70 bg-card/75 py-5 lg:col-span-2">
                          <CardHeader className="px-5">
                            <CardTitle className="text-base">Critique + Objections</CardTitle>
                            <CardDescription>What to cut, what to tighten, and the questions investors will ask next.</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-4 px-5 lg:grid-cols-[1.3fr,0.7fr]">
                            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                              <MarkdownRenderer content={latestRehearsal.critique || latestRehearsal.error || "No critique yet."} />
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                              <div className="text-sm font-medium">Investor follow-up prompts</div>
                              <div className="mt-3 space-y-3">
                                {latestRehearsal.objectionPrompts.length > 0 ? (
                                  latestRehearsal.objectionPrompts.map((prompt) => (
                                    <div key={prompt} className="rounded-xl border border-border/70 bg-card/70 px-3 py-3 text-sm text-muted-foreground">
                                      {prompt}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-muted-foreground">No objection prompts yet.</div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </section>

              <section>
                <Card className="page-surface-card border-border/70 bg-card/85 py-6">
                  <CardHeader className="px-6">
                    <SectionHeader
                      kicker="Secondary Surface"
                      title="Founder Copilot"
                      detail="Use chat when you need a focused follow-up, not as the primary UI."
                      action={
                        <Button type="button" variant="outline" onClick={() => setIsCopilotOpen((current) => !current)}>
                          {isCopilotOpen ? "Hide" : "Open"} Copilot
                        </Button>
                      }
                    />
                  </CardHeader>
                  {isCopilotOpen ? (
                    <CardContent className="space-y-4 px-6">
                      <div className="rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
                        <ScrollArea className="h-[20rem] pr-4">
                          <div className="space-y-4">
                            {activeWorkspace.copilotMessages.length > 0 ? (
                              activeWorkspace.copilotMessages.map((message) => (
                                <MessageBubble
                                  key={message.id}
                                  message={message}
                                  onCopy={(content) => void copyText(content, "Copilot message")}
                                />
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 px-5 py-10 text-center text-sm text-muted-foreground">
                                Ask for investor rebuttals, landing-page rewrites, sharper GTM experiments, or objections to expect.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      <form onSubmit={sendCopilotMessage} className="rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
                        <Textarea
                          value={copilotPrompt}
                          onChange={(event) => setCopilotPrompt(event.target.value)}
                          placeholder="Ask the copilot to tighten the wedge, rewrite the hero, or challenge the deck."
                          className="min-h-28"
                        />
                        <div className="mt-3 flex justify-end">
                          <Button type="submit" disabled={isBusy || !copilotPrompt.trim()}>
                            <Rocket className="h-4 w-4" />
                            Send to Copilot
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  ) : null}
                </Card>
              </section>
            </main>
          </div>
        </div>
        <Toaster position="top-center" />
      </div>
    </ThemeWrapper>
  );
}

export default FounderWarRoom;
