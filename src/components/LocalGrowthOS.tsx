import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  CheckCheck,
  Copy,
  Download,
  Globe2,
  Loader2,
  MapPinned,
  Mic,
  PauseCircle,
  Plus,
  Radar,
  Search,
  Sparkles,
  Trash2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import {
  LocalGrowthBackendClient,
  type FeatureAvailability,
} from "@/lib/local-growth-backend-client";
import { LocalGrowthOSService } from "@/lib/local-growth-os-service";
import { LocalGrowthWorkspaceStorage } from "@/lib/local-growth-storage";
import {
  createEmptyOrganizationWorkspace,
  createLocalGrowthId,
  type ApprovalThread,
  type CampaignBrief,
  type CompetitorProfile,
  type LocalGrowthAsset,
  type LocalGrowthAssetType,
  type LocalGrowthSource,
  type LocationProfile,
  type OrganizationWorkspace,
  type VoiceSession,
} from "@/lib/local-growth-types";
import { FirebaseService } from "@/lib/firebase-service";
import type { Message } from "@/lib/types";

const INTEL_ASSETS: LocalGrowthAssetType[] = [
  "brand_voice_summary",
  "opportunity_matrix",
  "competitor_summary",
  "ai_visibility_readiness",
];

const CAMPAIGN_ASSETS: LocalGrowthAssetType[] = [
  "localized_landing_page",
  "gbp_post_pack",
  "social_ad_pack",
  "review_response_pack",
  "voiceover_script",
  "creative_prompt",
  "creative_image",
];

type LocationDraft = {
  name: string;
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  serviceRadiusKm: string;
  notes: string;
};

type CampaignDraft = {
  name: string;
  objective: string;
  offer: string;
  audience: string;
  seasonalContext: string;
  cta: string;
  notes: string;
};

const defaultFeatures: FeatureAvailability = {
  research: false,
  geo: false,
  voice: false,
  sharing: false,
  approvals: false,
  analytics: false,
  leadAgent: false,
  creativeLab: false,
};

function formatDate(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toLocaleString() : "Never";
}

function createLocationDraft(): LocationDraft {
  return {
    name: "",
    addressLine: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    serviceRadiusKm: "10",
    notes: "",
  };
}

function createCampaignDraft(): CampaignDraft {
  return {
    name: "",
    objective: "",
    offer: "",
    audience: "",
    seasonalContext: "",
    cta: "",
    notes: "",
  };
}

function createBrief(draft: CampaignDraft, locationIds: string[]): CampaignBrief {
  return {
    id: createLocalGrowthId("brief"),
    name: draft.name.trim() || "Local growth sprint",
    objective: draft.objective.trim(),
    offer: draft.offer.trim(),
    channels: ["landing_page", "gbp", "social", "ads", "review_replies", "voiceover"],
    targetLocationIds: locationIds,
    audience: draft.audience.trim(),
    seasonalContext: draft.seasonalContext.trim(),
    cta: draft.cta.trim(),
    notes: draft.notes.trim(),
    status: "ready",
    updatedAt: Date.now(),
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function mergeSources(existing: LocalGrowthSource[], incoming: LocalGrowthSource[]) {
  const merged = new Map<string, LocalGrowthSource>();
  [...incoming, ...existing].forEach((source) => {
    const key = source.url || `${source.type}:${source.title}`.toLowerCase();
    if (!merged.has(key)) merged.set(key, source);
  });
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function mergeLocations(existing: LocationProfile[], incoming: LocationProfile[]) {
  const merged = new Map<string, LocationProfile>();
  [...incoming, ...existing].forEach((location) => {
    const key = location.id || `${location.name}:${location.addressLine}`.toLowerCase();
    const current = merged.get(key);
    if (!current || location.updatedAt >= current.updatedAt) merged.set(key, location);
  });
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function mergeCompetitors(existing: CompetitorProfile[], incoming: CompetitorProfile[]) {
  const merged = new Map<string, CompetitorProfile>();
  [...incoming, ...existing].forEach((competitor) => {
    const key = competitor.url || competitor.name.toLowerCase();
    const current = merged.get(key);
    if (!current || competitor.updatedAt >= current.updatedAt) merged.set(key, competitor);
  });
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function getAssetContent(asset?: LocalGrowthAsset): string {
  return LocalGrowthWorkspaceStorage.getAssetContent(asset);
}

function updateAssetMedia(
  workspace: OrganizationWorkspace,
  assetType: LocalGrowthAssetType,
  patch: Partial<LocalGrowthAsset>,
): OrganizationWorkspace {
  return {
    ...workspace,
    updatedAt: Date.now(),
    assets: workspace.assets.map((asset) =>
      asset.type === assetType ? { ...asset, ...patch, updatedAt: Date.now() } : asset,
    ),
  };
}

function AssetCard({ asset }: { asset: LocalGrowthAsset }) {
  const content = getAssetContent(asset);
  return (
    <Card className="border-border/70 bg-card/75">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{asset.title}</CardTitle>
            <CardDescription>{asset.description}</CardDescription>
          </div>
          <Badge variant={asset.status === "ready" ? "secondary" : "outline"}>
            {asset.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {asset.imageUrl ? (
          <img src={asset.imageUrl} alt={asset.title} className="rounded-2xl border border-border/70" />
        ) : null}
        {asset.audioUrl ? (
          <audio controls className="w-full">
            <source src={asset.audioUrl} />
          </audio>
        ) : null}
        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          {content ? <MarkdownRenderer content={content} /> : <div className="text-sm text-muted-foreground">Not generated yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LocalGrowthOS() {
  const [initialWorkspace] = useState(() => createEmptyOrganizationWorkspace());
  const [userId, setUserId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<"local" | "cloud">("local");
  const [features, setFeatures] = useState(defaultFeatures);
  const [workspaces, setWorkspaces] = useState<OrganizationWorkspace[]>([initialWorkspace]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(initialWorkspace.id);
  const [brandDraft, setBrandDraft] = useState(initialWorkspace.brand);
  const [locationDraft, setLocationDraft] = useState(createLocationDraft());
  const [campaignDraft, setCampaignDraft] = useState(createCampaignDraft());
  const [approvalComment, setApprovalComment] = useState("");
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
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

  const readyAssets = activeWorkspace?.assets.filter((asset) => asset.status === "ready").length || 0;
  const latestAudit = activeWorkspace?.audits[0];
  const latestBundle = activeWorkspace?.bundles[0];
  const latestVoiceSession = activeWorkspace?.voiceSessions[0];
  const isBusy = Boolean(busyAction);

  const applyWorkspaceSnapshot = useEffectEvent((nextWorkspaces: OrganizationWorkspace[], nextActiveWorkspaceId?: string | null) => {
    const sorted = [...nextWorkspaces].sort((a, b) => b.updatedAt - a.updatedAt);
    const selectedWorkspace = sorted.find((item) => item.id === nextActiveWorkspaceId) || sorted[0] || null;
    setWorkspaces(sorted);
    setActiveWorkspaceId(selectedWorkspace?.id || null);
    setBrandDraft(selectedWorkspace ? selectedWorkspace.brand : createEmptyOrganizationWorkspace().brand);
    setLocationDraft(createLocationDraft());
    setCampaignDraft(createCampaignDraft());
    setApprovalComment("");
    setCopilotPrompt("");
    lastSelectedWorkspaceIdRef.current = selectedWorkspace?.id || null;
  });

  const createFallbackWorkspace = useEffectEvent((nextUserId: string | null) => {
    const workspace = createEmptyOrganizationWorkspace();
    applyWorkspaceSnapshot([workspace], workspace.id);
    if (nextUserId) {
      void LocalGrowthWorkspaceStorage.saveWorkspace(nextUserId, workspace).catch((error) => {
        console.warn("Failed to persist fallback Local Growth OS workspace:", error);
      });
    }
    return workspace;
  });

  async function persistWorkspace(workspace: OrganizationWorkspace): Promise<OrganizationWorkspace> {
    const nextWorkspace = {
      ...workspace,
      name: workspace.brand.clientName.trim() || workspace.name,
      updatedAt: workspace.updatedAt || Date.now(),
    };
    setWorkspaces((current) =>
      [nextWorkspace, ...current.filter((item) => item.id !== nextWorkspace.id)].sort((a, b) => b.updatedAt - a.updatedAt),
    );
    setActiveWorkspaceId(nextWorkspace.id);
    if (userId) await LocalGrowthWorkspaceStorage.saveWorkspace(userId, nextWorkspace);
    return nextWorkspace;
  }

  function withBrandDraft(workspace: OrganizationWorkspace): OrganizationWorkspace {
    return {
      ...workspace,
      brand: { ...brandDraft },
      name: brandDraft.clientName.trim() || workspace.name,
      updatedAt: Date.now(),
    };
  }

  function replaceAudioPreview(url: string) {
    if (audioPreviewObjectUrlRef.current) URL.revokeObjectURL(audioPreviewObjectUrlRef.current);
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
    const workspace = createEmptyOrganizationWorkspace();
    setBrandDraft(workspace.brand);
    setLocationDraft(createLocationDraft());
    setCampaignDraft(createCampaignDraft());
    await persistWorkspace(workspace);
  }

  async function handleDeleteWorkspace(workspaceId: string) {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;
    if (!window.confirm(`Delete "${workspace.brand.clientName || workspace.name}"?`)) return;

    const remaining = workspaces.filter((item) => item.id !== workspaceId);
    setWorkspaces(remaining);
    if (userId) await LocalGrowthWorkspaceStorage.deleteWorkspace(userId, workspaceId);
    if (remaining.length === 0) {
      await handleCreateWorkspace();
      return;
    }
    applyWorkspaceSnapshot(remaining, remaining[0].id);
  }

  async function saveBrand(event?: FormEvent) {
    event?.preventDefault();
    if (!activeWorkspace) return;
    await persistWorkspace({ ...withBrandDraft(activeWorkspace), stage: "locations", updatedAt: Date.now() });
    toast.success("Client brand saved");
  }

  async function importBrand() {
    if (!activeWorkspace || !brandDraft.websiteUrl.trim() || isBusy) return;
    setBusyAction("Importing website");
    try {
      const response = await LocalGrowthBackendClient.importBrand(
        brandDraft.websiteUrl.trim(),
        brandDraft.brandNotes.trim(),
      );
      const nextWorkspace = {
        ...withBrandDraft(activeWorkspace),
        stage: "locations" as const,
        updatedAt: Date.now(),
        brand: { ...withBrandDraft(activeWorkspace).brand, ...response.brandSnapshot },
        sources: mergeSources(activeWorkspace.sources, response.sources),
        competitors: mergeCompetitors(activeWorkspace.competitors, response.competitors),
      };
      setBrandDraft(nextWorkspace.brand);
      await persistWorkspace(nextWorkspace);
      toast.success("Brand import complete");
      void LocalGrowthBackendClient.captureAnalyticsEvent("brand_imported", {
        websiteUrl: nextWorkspace.brand.websiteUrl,
      }).catch(() => undefined);
    } catch (error) {
      console.error("Brand import failed:", error);
      toast.error(error instanceof Error ? error.message : "Brand import failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function addLocation(event?: FormEvent) {
    event?.preventDefault();
    if (!activeWorkspace || !locationDraft.addressLine.trim() || isBusy) return;
    setBusyAction("Enriching location");
    try {
      const response = await LocalGrowthBackendClient.enrichLocation({
        ...locationDraft,
        serviceRadiusKm: Number(locationDraft.serviceRadiusKm || 10),
        brandName: brandDraft.clientName,
        vertical: brandDraft.vertical,
      });
      const nextWorkspace = {
        ...withBrandDraft(activeWorkspace),
        stage: "intel" as const,
        updatedAt: Date.now(),
        locations: mergeLocations(activeWorkspace.locations, [response.location]),
        competitors: mergeCompetitors(activeWorkspace.competitors, response.competitors),
        sources: mergeSources(activeWorkspace.sources, response.sources),
      };
      await persistWorkspace(nextWorkspace);
      setLocationDraft(createLocationDraft());
      toast.success("Location enriched");
    } catch (error) {
      console.error("Location enrichment failed:", error);
      toast.error(error instanceof Error ? error.message : "Location enrichment failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function runIntelAudit() {
    if (!activeWorkspace || activeWorkspace.locations.length === 0 || isBusy) return;
    setBusyAction("Running market intel");
    try {
      const draftedWorkspace = withBrandDraft(activeWorkspace);
      const intelResponse = await LocalGrowthBackendClient.runIntelAudit(draftedWorkspace);
      let workingWorkspace: OrganizationWorkspace = {
        ...draftedWorkspace,
        stage: "intel",
        updatedAt: Date.now(),
        audits: [intelResponse.audit, ...draftedWorkspace.audits.filter((item) => item.id !== intelResponse.audit.id)],
        competitors: mergeCompetitors(draftedWorkspace.competitors, intelResponse.competitors),
        sources: mergeSources(draftedWorkspace.sources, intelResponse.sources),
      };
      workingWorkspace = await persistWorkspace(
        LocalGrowthOSService.markAssetsGenerating(workingWorkspace, INTEL_ASSETS),
      );
      const updates = await LocalGrowthOSService.generateIntelAssets(workingWorkspace, userId || undefined);
      workingWorkspace = await persistWorkspace(
        LocalGrowthOSService.applyGeneratedAssets(workingWorkspace, updates),
      );
      toast.success("Market intel board updated");
    } catch (error) {
      console.error("Intel audit failed:", error);
      if (activeWorkspace) {
        await persistWorkspace(
          LocalGrowthOSService.markAssetsError(
            activeWorkspace,
            INTEL_ASSETS,
            error instanceof Error ? error.message : "Intel generation failed",
          ),
        );
      }
      toast.error(error instanceof Error ? error.message : "Intel audit failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function runCampaignStudio() {
    if (!activeWorkspace || activeWorkspace.locations.length === 0 || isBusy) return;
    const brief = createBrief(campaignDraft, activeWorkspace.locations.map((location) => location.id));
    setBusyAction("Generating campaign bundle");
    try {
      let workingWorkspace: OrganizationWorkspace = {
        ...withBrandDraft(activeWorkspace),
        stage: "campaign",
        updatedAt: Date.now(),
        briefs: [brief, ...activeWorkspace.briefs.filter((item) => item.id !== brief.id)],
      };
      workingWorkspace = await persistWorkspace(
        LocalGrowthOSService.markAssetsGenerating(workingWorkspace, CAMPAIGN_ASSETS),
      );
      const updates = await LocalGrowthOSService.generateCampaignAssets(workingWorkspace, brief, userId || undefined);
      workingWorkspace = LocalGrowthOSService.applyGeneratedAssets(workingWorkspace, updates, brief.id);
      try {
        const creativeImage = await LocalGrowthOSService.generateCreativeImage(workingWorkspace);
        workingWorkspace = LocalGrowthOSService.applyCreativeImage(workingWorkspace, creativeImage);
      } catch (imageError) {
        console.warn("Creative image generation failed:", imageError);
      }
      const voiceScript = getAssetContent(
        workingWorkspace.assets.find((asset) => asset.type === "voiceover_script"),
      );
      if (voiceScript && features.voice) {
        try {
          const audio = await LocalGrowthBackendClient.synthesizeVoiceScript(voiceScript);
          workingWorkspace = updateAssetMedia(workingWorkspace, "voiceover_script", {
            audioUrl: audio.audioDataUrl,
          });
        } catch (voiceError) {
          console.warn("Voice synthesis failed:", voiceError);
        }
      }
      let bundle = LocalGrowthOSService.buildAssetBundle(workingWorkspace, brief);
      workingWorkspace = {
        ...workingWorkspace,
        bundles: [bundle, ...workingWorkspace.bundles.filter((item) => item.id !== bundle.id)],
      };
      workingWorkspace = await persistWorkspace(workingWorkspace);
      if (features.sharing) {
        try {
          const share = await LocalGrowthBackendClient.shareBundle(bundle, workingWorkspace);
          bundle = {
            ...bundle,
            shareUrl: share.shareUrl || bundle.shareUrl,
            provider: share.provider,
            status: share.shareUrl ? "shared" : bundle.status,
            updatedAt: Date.now(),
          };
          await persistWorkspace({
            ...workingWorkspace,
            bundles: [bundle, ...workingWorkspace.bundles.filter((item) => item.id !== bundle.id)],
          });
        } catch (shareError) {
          console.warn("Bundle sharing failed:", shareError);
        }
      }
      toast.success("Campaign bundle ready");
    } catch (error) {
      console.error("Campaign generation failed:", error);
      if (activeWorkspace) {
        await persistWorkspace(
          LocalGrowthOSService.markAssetsError(
            activeWorkspace,
            CAMPAIGN_ASSETS,
            error instanceof Error ? error.message : "Campaign generation failed",
          ),
        );
      }
      toast.error(error instanceof Error ? error.message : "Campaign generation failed");
    } finally {
      setBusyAction(null);
    }
  }

  function buildApprovalThread(workspace: OrganizationWorkspace): ApprovalThread {
    const latest = workspace.bundles[0];
    return {
      id: createLocalGrowthId("approval"),
      title: latest?.title || "Campaign review",
      assetIds: latest?.assetIds || [],
      assignee: "Client team",
      status: "review",
      comments: [
        {
          id: createLocalGrowthId("comment"),
          author: "Local Growth OS",
          body: "Bundle is ready for review. Start with the landing page, GBP pack, and ad hooks.",
          createdAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    };
  }

  async function createApproval() {
    if (!activeWorkspace || activeWorkspace.bundles.length === 0 || isBusy) return;
    setBusyAction("Creating approval thread");
    try {
      let thread = buildApprovalThread(activeWorkspace);
      let nextWorkspace = await persistWorkspace({
        ...activeWorkspace,
        stage: "approvals",
        updatedAt: Date.now(),
        approvals: [thread, ...activeWorkspace.approvals.filter((item) => item.id !== thread.id)],
      });
      if (features.approvals) {
        try {
          const sync = await LocalGrowthBackendClient.syncApproval(thread, nextWorkspace);
          thread = {
            ...thread,
            provider: sync.provider,
            externalThreadUrl: sync.externalThreadUrl,
            updatedAt: Date.now(),
          };
          nextWorkspace = await persistWorkspace({
            ...nextWorkspace,
            approvals: [thread, ...nextWorkspace.approvals.filter((item) => item.id !== thread.id)],
          });
        } catch (syncError) {
          console.warn("Approval sync failed:", syncError);
        }
      }
      toast.success("Approval thread created");
    } finally {
      setBusyAction(null);
    }
  }

  async function addApprovalComment(threadId: string) {
    if (!activeWorkspace || !approvalComment.trim()) return;
    const thread = activeWorkspace.approvals.find((item) => item.id === threadId);
    if (!thread) return;
    const nextThread: ApprovalThread = {
      ...thread,
      comments: [
        ...thread.comments,
        {
          id: createLocalGrowthId("comment"),
          author: "Operator",
          body: approvalComment.trim(),
          createdAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    };
    await persistWorkspace({
      ...activeWorkspace,
      updatedAt: Date.now(),
      approvals: [nextThread, ...activeWorkspace.approvals.filter((item) => item.id !== nextThread.id)],
    });
    setApprovalComment("");
    toast.success("Comment added");
  }

  async function exportWorkspace() {
    if (!activeWorkspace) return;
    setBusyAction("Exporting markdown");
    try {
      let markdown = "";
      try {
        markdown = (await LocalGrowthBackendClient.exportWorkspace(activeWorkspace)).markdown;
      } catch (error) {
        console.warn("Backend export failed, using local export:", error);
        markdown = LocalGrowthWorkspaceStorage.exportWorkspaceMarkdown(activeWorkspace);
      }
      const slug =
        (activeWorkspace.brand.clientName || activeWorkspace.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "local-growth-os";
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slug}-local-growth-os.md`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Workspace exported");
    } finally {
      setBusyAction(null);
    }
  }

  async function runVoiceBrief() {
    if (!activeWorkspace || !audioDataUrl || isBusy) return;
    const pending: VoiceSession = {
      id: createLocalGrowthId("voice"),
      fileName: audioFileName,
      transcript: "",
      extractedRequests: [],
      generatedScript: "",
      status: "processing",
      updatedAt: Date.now(),
    };
    let nextWorkspace = await persistWorkspace({
      ...activeWorkspace,
      updatedAt: Date.now(),
      voiceSessions: [pending, ...activeWorkspace.voiceSessions.filter((item) => item.id !== pending.id)],
    });
    setBusyAction("Processing voice brief");
    try {
      const transcription = await LocalGrowthBackendClient.transcribeVoiceBrief(audioDataUrl, audioFileName);
      const analysis = await LocalGrowthOSService.analyzeVoiceBrief(
        nextWorkspace,
        transcription.transcript,
        userId || undefined,
      );
      let polishedAudioUrl: string | undefined;
      if (features.voice && analysis.generatedScript) {
        try {
          const synth = await LocalGrowthBackendClient.synthesizeVoiceScript(analysis.generatedScript);
          polishedAudioUrl = synth.audioDataUrl;
        } catch (synthError) {
          console.warn("Voice synthesis for session failed:", synthError);
        }
      }
      let configuredLead = nextWorkspace.leadCaptureSessions[0];
      if (features.leadAgent) {
        try {
          const leadResponse = await LocalGrowthBackendClient.configureLeadAgent(nextWorkspace);
          configuredLead = leadResponse.leadCapture;
        } catch (leadError) {
          console.warn("Lead agent configuration failed:", leadError);
        }
      }
      const readySession: VoiceSession = {
        ...pending,
        transcript: analysis.transcript,
        extractedRequests: analysis.extractedRequests,
        generatedScript: analysis.generatedScript,
        polishedAudioUrl,
        status: "ready",
        updatedAt: Date.now(),
      };
      nextWorkspace = await persistWorkspace({
        ...nextWorkspace,
        updatedAt: Date.now(),
        voiceSessions: [readySession, ...nextWorkspace.voiceSessions.filter((item) => item.id !== readySession.id)],
        leadCaptureSessions: configuredLead
          ? [configuredLead, ...nextWorkspace.leadCaptureSessions.filter((item) => item.id !== configuredLead.id)]
          : nextWorkspace.leadCaptureSessions,
      });
      void nextWorkspace;
      toast.success("Voice brief processed");
    } catch (error) {
      await persistWorkspace({
        ...nextWorkspace,
        updatedAt: Date.now(),
        voiceSessions: [
          {
            ...pending,
            status: "error",
            error: error instanceof Error ? error.message : "Voice brief failed",
            updatedAt: Date.now(),
          },
          ...nextWorkspace.voiceSessions.filter((item) => item.id !== pending.id),
        ],
      });
      toast.error(error instanceof Error ? error.message : "Voice brief failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function sendCopilotMessage(event?: FormEvent) {
    event?.preventDefault();
    if (!activeWorkspace || !copilotPrompt.trim() || isBusy) return;
    const prompt = copilotPrompt.trim();
    const userMessage: Message = {
      id: createLocalGrowthId("message"),
      content: prompt,
      role: "user",
      timestamp: Date.now(),
    };
    setBusyAction("Consulting copilot");
    setIsCopilotOpen(true);
    setCopilotPrompt("");
    const workingWorkspace = {
      ...withBrandDraft(activeWorkspace),
      updatedAt: Date.now(),
      copilotMessages: [...activeWorkspace.copilotMessages, userMessage],
    };
    await persistWorkspace(workingWorkspace);
    try {
      const reply = await LocalGrowthOSService.generateCopilotMessage(
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
            id: createLocalGrowthId("message"),
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
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const fileName = `local-growth-brief-${Date.now()}.webm`;
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
    toast.success("Voice brief ready");
  }

  async function runGrowthSprint() {
    if (!activeWorkspace || isBusy) return;
    setBusyAction("Running local growth sprint");
    try {
      if (brandDraft.websiteUrl.trim() && activeWorkspace.sources.length === 0) await importBrand();
      const afterImport = workspaces.find((item) => item.id === activeWorkspaceId) || activeWorkspace;
      if (afterImport.locations.length > 0 && afterImport.audits.length === 0) await runIntelAudit();
      const afterIntel = workspaces.find((item) => item.id === activeWorkspaceId) || afterImport;
      if (afterIntel.locations.length > 0) await runCampaignStudio();
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
        await FirebaseService.initialize();
        uid = await FirebaseService.getCurrentUserId();
      } catch (error) {
        console.warn("Local Growth OS bootstrap fell back to local mode:", error);
        uid = FirebaseService.getOrCreateLocalSessionId();
      }
      if (cancelled) return;
      setUserId(uid);
      setStorageMode(FirebaseService.getStorageMode());
      try {
        const availability = await LocalGrowthBackendClient.getFeatureAvailability();
        if (!cancelled) setFeatures(availability);
      } catch (error) {
        console.warn("Failed to load Local Growth OS feature availability:", error);
      }
      let loaded: OrganizationWorkspace[] = [];
      if (uid) {
        try {
          loaded = await LocalGrowthWorkspaceStorage.listWorkspaces(uid);
        } catch (error) {
          console.warn("Failed to restore Local Growth OS workspaces:", error);
        }
      }
      if (cancelled) return;
      if (loaded.length === 0) {
        applyWorkspaceSnapshot([initialWorkspace], initialWorkspace.id);
        if (uid) {
          void LocalGrowthWorkspaceStorage.saveWorkspace(uid, initialWorkspace).catch((error) => {
            console.warn("Failed to persist initial Local Growth OS workspace:", error);
          });
        }
      } else {
        applyWorkspaceSnapshot(loaded, loaded[0].id);
      }
      setIsHydrating(false);
    };
    initialize().catch((error) => {
      console.error("Local Growth OS init failed:", error);
      toast.error("Failed to initialize Local Growth OS");
      const fallbackUserId = FirebaseService.getOrCreateLocalSessionId();
      if (!cancelled) {
        setUserId(fallbackUserId);
        setStorageMode("local");
        createFallbackWorkspace(fallbackUserId);
      }
      setIsHydrating(false);
    });
    return () => {
      cancelled = true;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioPreviewObjectUrlRef.current) URL.revokeObjectURL(audioPreviewObjectUrlRef.current);
    };
  }, [applyWorkspaceSnapshot, createFallbackWorkspace, initialWorkspace]);

  useEffect(() => {
    if (isHydrating || activeWorkspace) return;
    if (workspaces.length > 0) {
      applyWorkspaceSnapshot(workspaces, workspaces[0].id);
      return;
    }
    const fallbackUserId = userId || FirebaseService.getOrCreateLocalSessionId();
    setUserId(fallbackUserId);
    setStorageMode("local");
    createFallbackWorkspace(fallbackUserId);
  }, [activeWorkspace, applyWorkspaceSnapshot, createFallbackWorkspace, isHydrating, userId, workspaces]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (lastSelectedWorkspaceIdRef.current === activeWorkspaceId) return;
    const nextWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
    if (!nextWorkspace) return;
    lastSelectedWorkspaceIdRef.current = activeWorkspaceId;
    setBrandDraft(nextWorkspace.brand);
    setLocationDraft(createLocationDraft());
    setCampaignDraft(createCampaignDraft());
    setApprovalComment("");
  }, [activeWorkspaceId, workspaces]);

  if (!activeWorkspace) {
    return (
      <ThemeWrapper>
        <div className="min-h-screen app-shell-gradient text-foreground">
          <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
            <Card className="w-full max-w-xl border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Local Growth OS
                </CardTitle>
                <CardDescription>
                  Recovering your client workspace, campaign assets, and market intel.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <Toaster position="top-center" />
        </div>
      </ThemeWrapper>
    );
  }

  const intelAssets = activeWorkspace.assets.filter((asset) => INTEL_ASSETS.includes(asset.type));
  const campaignAssets = activeWorkspace.assets.filter((asset) => CAMPAIGN_ASSETS.includes(asset.type));

  return (
    <ThemeWrapper>
      <div className="min-h-screen app-shell-gradient text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-[2rem] border border-border/70 bg-card/75 p-5 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.45)] backdrop-blur sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/90 text-primary-foreground">Local Growth OS</Badge>
                  <Badge variant="outline">Agency + Multi-location</Badge>
                  <Badge variant="outline">{storageMode === "cloud" ? "Firebase sync on" : "Local-first mode"}</Badge>
                  {isHydrating ? <Badge variant="secondary">Syncing workspace</Badge> : null}
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-4xl text-balance font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Audit the market. Localize the campaign. Ship the bundle.
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                    Pull website signals, enrich locations, score local visibility, and generate
                    campaign-ready assets with approvals and voice intake built in.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button type="button" variant="outline" onClick={handleCreateWorkspace}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Workspace
                </Button>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Badge variant="secondary">{activeWorkspace.locations.length} locations</Badge>
              <Badge variant="secondary">{activeWorkspace.competitors.length} competitors</Badge>
              <Badge variant="secondary">{readyAssets} assets ready</Badge>
              <Badge variant="secondary">{activeWorkspace.bundles.length} bundles</Badge>
              <Button type="button" onClick={runGrowthSprint} disabled={isBusy}>
                <Sparkles className="mr-2 h-4 w-4" />
                {busyAction || "Run Local Growth Sprint"}
              </Button>
              <Button type="button" variant="outline" onClick={exportWorkspace} disabled={isBusy}>
                <Download className="mr-2 h-4 w-4" />
                Export Markdown
              </Button>
            </div>
          </header>

          <main className="mt-6 grid gap-6">
            <Card className="border-border/70 bg-card/75">
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
                <CardDescription>Switch clients and track the current workspace at a glance.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {workspaces.map((workspace) => (
                  <button
                    type="button"
                    key={workspace.id}
                    onClick={() => setActiveWorkspaceId(workspace.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      workspace.id === activeWorkspaceId
                        ? "border-primary/70 bg-background/80"
                        : "border-border/70 bg-background/45"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{workspace.brand.clientName || workspace.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{workspace.brand.websiteUrl || "No website yet"}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteWorkspace(workspace.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">Updated {formatDate(workspace.updatedAt)}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/70 bg-card/75">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle>Brand Setup</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={(event) => void saveBrand(event)}>
                    <Input value={brandDraft.clientName} onChange={(event) => setBrandDraft((current) => ({ ...current, clientName: event.target.value }))} placeholder="Client name" />
                    <Input value={brandDraft.websiteUrl} onChange={(event) => setBrandDraft((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="Website URL" />
                    <Input value={brandDraft.vertical} onChange={(event) => setBrandDraft((current) => ({ ...current, vertical: event.target.value }))} placeholder="Vertical" />
                    <Input value={brandDraft.targetAudience} onChange={(event) => setBrandDraft((current) => ({ ...current, targetAudience: event.target.value }))} placeholder="Audience" />
                    <Input value={brandDraft.coreOffer} onChange={(event) => setBrandDraft((current) => ({ ...current, coreOffer: event.target.value }))} placeholder="Core offer" />
                    <Input value={brandDraft.goals} onChange={(event) => setBrandDraft((current) => ({ ...current, goals: event.target.value }))} placeholder="Primary goal" />
                    <Textarea value={brandDraft.differentiators} onChange={(event) => setBrandDraft((current) => ({ ...current, differentiators: event.target.value }))} placeholder="Differentiators" />
                    <Textarea value={brandDraft.proofPoints} onChange={(event) => setBrandDraft((current) => ({ ...current, proofPoints: event.target.value }))} placeholder="Proof points" />
                    <Textarea value={brandDraft.voiceExamples} onChange={(event) => setBrandDraft((current) => ({ ...current, voiceExamples: event.target.value }))} placeholder="Voice examples" />
                    <Textarea value={brandDraft.brandNotes} onChange={(event) => setBrandDraft((current) => ({ ...current, brandNotes: event.target.value }))} placeholder="Notes for the operator stack" />
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" disabled={isBusy}>Save Brand</Button>
                      <Button type="button" variant="outline" onClick={importBrand} disabled={isBusy || !brandDraft.websiteUrl.trim()}>
                        <Globe2 className="mr-2 h-4 w-4" />
                        Import Website
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/75">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5 text-primary" />
                    <CardTitle>Location Setup</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form className="grid gap-4" onSubmit={(event) => void addLocation(event)}>
                    <Input value={locationDraft.name} onChange={(event) => setLocationDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Location name" />
                    <Input value={locationDraft.addressLine} onChange={(event) => setLocationDraft((current) => ({ ...current, addressLine: event.target.value }))} placeholder="Street address" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input value={locationDraft.city} onChange={(event) => setLocationDraft((current) => ({ ...current, city: event.target.value }))} placeholder="City" />
                      <Input value={locationDraft.region} onChange={(event) => setLocationDraft((current) => ({ ...current, region: event.target.value }))} placeholder="Region" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input value={locationDraft.postalCode} onChange={(event) => setLocationDraft((current) => ({ ...current, postalCode: event.target.value }))} placeholder="Postal code" />
                      <Input value={locationDraft.country} onChange={(event) => setLocationDraft((current) => ({ ...current, country: event.target.value }))} placeholder="Country" />
                    </div>
                    <Input value={locationDraft.serviceRadiusKm} onChange={(event) => setLocationDraft((current) => ({ ...current, serviceRadiusKm: event.target.value }))} placeholder="Service radius km" />
                    <Textarea value={locationDraft.notes} onChange={(event) => setLocationDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Neighborhood notes, seasonality, service area notes" />
                    <Button type="submit" disabled={isBusy}>Add Enriched Location</Button>
                  </form>
                  <div className="grid gap-3">
                    {activeWorkspace.locations.map((location) => (
                      <div key={location.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                        <div className="font-medium">{location.name || location.city}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{[location.addressLine, location.city, location.region, location.country].filter(Boolean).join(", ")}</div>
                        <div className="mt-2 text-xs text-muted-foreground">{location.serviceRadiusKm} km radius</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/70 bg-card/75">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Radar className="h-5 w-5 text-primary" />
                    <CardTitle>Market Intel</CardTitle>
                  </div>
                  <CardDescription>Run the audit, capture competitor proof, and build the opportunity matrix.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={runIntelAudit} disabled={isBusy || activeWorkspace.locations.length === 0}>
                      Run Market Intel
                    </Button>
                    <Badge variant="secondary">{latestAudit ? `${latestAudit.score}/100 readiness` : "No audit yet"}</Badge>
                  </div>
                  {latestAudit?.staticMapUrl ? (
                    <img src={latestAudit.staticMapUrl} alt="Local market map" className="rounded-2xl border border-border/70" />
                  ) : null}
                  <div className="grid gap-3">
                    {activeWorkspace.competitors.slice(0, 6).map((competitor) => (
                      <div key={competitor.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{competitor.name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{competitor.summary || "No summary yet"}</div>
                          </div>
                          {competitor.url ? (
                            <a href={competitor.url} target="_blank" rel="noreferrer" className="text-primary">Open</a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-4">
                {intelAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/70 bg-card/75">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <WandSparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Campaign Studio</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Input value={campaignDraft.name} onChange={(event) => setCampaignDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Campaign name" />
                  <Input value={campaignDraft.objective} onChange={(event) => setCampaignDraft((current) => ({ ...current, objective: event.target.value }))} placeholder="Objective" />
                  <Input value={campaignDraft.offer} onChange={(event) => setCampaignDraft((current) => ({ ...current, offer: event.target.value }))} placeholder="Offer" />
                  <Input value={campaignDraft.audience} onChange={(event) => setCampaignDraft((current) => ({ ...current, audience: event.target.value }))} placeholder="Audience" />
                  <Input value={campaignDraft.cta} onChange={(event) => setCampaignDraft((current) => ({ ...current, cta: event.target.value }))} placeholder="Primary CTA" />
                  <Input value={campaignDraft.seasonalContext} onChange={(event) => setCampaignDraft((current) => ({ ...current, seasonalContext: event.target.value }))} placeholder="Seasonal context" />
                  <Textarea value={campaignDraft.notes} onChange={(event) => setCampaignDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Extra operator notes" />
                  <Button type="button" onClick={runCampaignStudio} disabled={isBusy || activeWorkspace.locations.length === 0}>
                    Generate Campaign Bundle
                  </Button>
                  {latestBundle ? (
                    <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                      <div className="font-medium">{latestBundle.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{latestBundle.assetIds.length} assets in bundle</div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Button type="button" variant="outline" onClick={createApproval} disabled={isBusy}>
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Create Approval
                        </Button>
                        {latestBundle.shareUrl ? (
                          <Button type="button" variant="outline" onClick={() => void copyText(latestBundle.shareUrl!, "Share URL")}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Share URL
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <div className="grid gap-4">
                {campaignAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/70 bg-card/75">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    <CardTitle>Voice & Intake</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" onClick={startRecording} disabled={isRecording || isBusy}>
                      <Mic className="mr-2 h-4 w-4" />
                      Record Brief
                    </Button>
                    <Button type="button" variant="outline" onClick={stopRecording} disabled={!isRecording}>
                      <PauseCircle className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                    <label className="inline-flex cursor-pointer">
                      <input type="file" accept="audio/*" className="hidden" onChange={(event) => void handleAudioUpload(event)} />
                      <span className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs">
                        Upload Audio
                      </span>
                    </label>
                  </div>
                  {audioPreviewUrl ? (
                    <audio controls className="w-full">
                      <source src={audioPreviewUrl} />
                    </audio>
                  ) : null}
                  <Button type="button" onClick={runVoiceBrief} disabled={isBusy || !audioDataUrl}>
                    Process Voice Brief
                  </Button>
                  {latestVoiceSession ? (
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/50 p-4">
                      <div>
                        <div className="font-medium">Transcript</div>
                        <div className="mt-1 text-sm text-muted-foreground">{latestVoiceSession.transcript}</div>
                      </div>
                      <div>
                        <div className="font-medium">Extracted Requests</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {latestVoiceSession.extractedRequests.join(" | ") || "None"}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Generated Script</div>
                        <div className="mt-1"><MarkdownRenderer content={latestVoiceSession.generatedScript || "No script"} /></div>
                      </div>
                      {latestVoiceSession.polishedAudioUrl ? (
                        <audio controls className="w-full">
                          <source src={latestVoiceSession.polishedAudioUrl} />
                        </audio>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/75">
                <CardHeader>
                  <CardTitle>Approvals, Insights, and Copilot</CardTitle>
                  <CardDescription>Review comments, feature readiness, and operator assistance in one place.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(features).map(([key, enabled]) => (
                      <div key={key} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                        <div className="font-medium capitalize">{key.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`)}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{enabled ? "Ready" : "Guarded"}</div>
                      </div>
                    ))}
                  </div>
                  {activeWorkspace.approvals.map((thread) => (
                    <div key={thread.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                      <div className="font-medium">{thread.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{thread.comments.length} comments · {thread.status}</div>
                      <div className="mt-3 space-y-2">
                        {thread.comments.map((comment) => (
                          <div key={comment.id} className="rounded-xl border border-border/70 p-3 text-sm">
                            <div className="text-xs text-muted-foreground">{comment.author} · {formatDate(comment.createdAt)}</div>
                            <div className="mt-1">{comment.body}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-3">
                        <Textarea value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} placeholder="Add comment or revision note" />
                        <Button type="button" onClick={() => void addApprovalComment(thread.id)}>Add</Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setIsCopilotOpen((current) => !current)}>
                    {isCopilotOpen ? "Hide Copilot" : "Open Copilot"}
                  </Button>
                  {isCopilotOpen ? (
                    <>
                      <ScrollArea className="h-72 rounded-2xl border border-border/70 bg-background/55 p-4">
                        <div className="space-y-4">
                          {activeWorkspace.copilotMessages.length > 0 ? (
                            activeWorkspace.copilotMessages.map((message) => (
                              <MessageBubble key={message.id} message={message} />
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">No copilot messages yet.</div>
                          )}
                        </div>
                      </ScrollArea>
                      <form className="space-y-3" onSubmit={(event) => void sendCopilotMessage(event)}>
                        <Textarea value={copilotPrompt} onChange={(event) => setCopilotPrompt(event.target.value)} placeholder="Ask the copilot to tighten the local angle, rewrite the review replies, or audit the bundle." />
                        <Button type="submit" disabled={isBusy || !copilotPrompt.trim()}>
                          <Search className="mr-2 h-4 w-4" />
                          Ask Copilot
                        </Button>
                      </form>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
        <Toaster position="top-center" />
      </div>
    </ThemeWrapper>
  );
}
