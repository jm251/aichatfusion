import { FirebaseService } from "./firebase-service";
import type {
  FounderArtifact,
  FounderArtifactType,
  FounderWorkspace,
} from "./founder-types";

const STORAGE_PREFIX = "founder-war-room-workspaces";

function sortByUpdatedAtDesc(
  workspaces: FounderWorkspace[],
): FounderWorkspace[] {
  return [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt);
}

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readLocalWorkspaces(userId: string): FounderWorkspace[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortByUpdatedAtDesc(parsed as FounderWorkspace[]);
  } catch (error) {
    console.error("Failed to read founder workspaces from localStorage:", error);
    return [];
  }
}

function writeLocalWorkspaces(
  userId: string,
  workspaces: FounderWorkspace[],
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(sortByUpdatedAtDesc(workspaces)),
    );
  } catch (error) {
    console.error("Failed to write founder workspaces to localStorage:", error);
  }
}

function mergeWorkspaces(
  primary: FounderWorkspace[],
  secondary: FounderWorkspace[],
): FounderWorkspace[] {
  const merged = new Map<string, FounderWorkspace>();

  [...secondary, ...primary].forEach((workspace) => {
    const current = merged.get(workspace.id);
    if (!current || workspace.updatedAt >= current.updatedAt) {
      merged.set(workspace.id, workspace);
    }
  });

  return sortByUpdatedAtDesc(Array.from(merged.values()));
}

export class FounderWorkspaceStorage {
  static async listWorkspaces(userId: string): Promise<FounderWorkspace[]> {
    const local = readLocalWorkspaces(userId);

    if (FirebaseService.getStorageMode() !== "cloud") {
      return local;
    }

    const remote = await FirebaseService.getFounderWorkspaces(userId);
    const merged = mergeWorkspaces(remote, local);
    writeLocalWorkspaces(userId, merged);
    return merged;
  }

  static async saveWorkspace(
    userId: string,
    workspace: FounderWorkspace,
  ): Promise<void> {
    const existing = readLocalWorkspaces(userId);
    const next = existing.filter((item) => item.id !== workspace.id);
    next.unshift(workspace);
    writeLocalWorkspaces(userId, next);

    if (FirebaseService.getStorageMode() === "cloud") {
      await FirebaseService.saveFounderWorkspace(userId, workspace);
    }
  }

  static async deleteWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const existing = readLocalWorkspaces(userId).filter(
      (workspace) => workspace.id !== workspaceId,
    );
    writeLocalWorkspaces(userId, existing);

    if (FirebaseService.getStorageMode() === "cloud") {
      await FirebaseService.deleteFounderWorkspace(userId, workspaceId);
    }
  }

  static getArtifact(
    workspace: FounderWorkspace,
    artifactType: FounderArtifactType,
  ): FounderArtifact | undefined {
    return workspace.artifacts.find((artifact) => artifact.type === artifactType);
  }

  static getArtifactContent(artifact?: FounderArtifact): string {
    if (!artifact || !artifact.currentVersionId) return "";

    return (
      artifact.versions.find(
        (version) => version.id === artifact.currentVersionId,
      )?.content || ""
    );
  }

  static exportWorkspaceMarkdown(workspace: FounderWorkspace): string {
    const lines: string[] = [];
    lines.push(`# ${workspace.brief.startupName || workspace.name}`);
    lines.push("");
    lines.push(`Updated: ${new Date(workspace.updatedAt).toLocaleString()}`);
    lines.push("");
    lines.push("## Brief");
    lines.push("");
    lines.push(`- Tagline: ${workspace.brief.tagline || "Not set"}`);
    lines.push(`- Stage: ${workspace.brief.stage || "Not set"}`);
    lines.push(`- Market: ${workspace.brief.market || "Not set"}`);
    lines.push(
      `- Target Customer: ${workspace.brief.targetCustomer || "Not set"}`,
    );
    lines.push(
      `- Business Model: ${workspace.brief.businessModel || "Not set"}`,
    );
    lines.push("");
    lines.push("### Problem");
    lines.push(workspace.brief.problem || "Not set");
    lines.push("");
    lines.push("### Solution");
    lines.push(workspace.brief.solution || "Not set");
    lines.push("");
    lines.push("### Goals");
    lines.push(workspace.brief.goals || "Not set");
    lines.push("");
    lines.push("### Differentiation");
    lines.push(workspace.brief.differentiation || "Not set");
    lines.push("");
    lines.push("## Evidence");
    lines.push("");

    if (workspace.sources.length === 0) {
      lines.push("No evidence sources yet.");
      lines.push("");
    } else {
      workspace.sources.forEach((source) => {
        lines.push(`### ${source.title}`);
        lines.push(`- Type: ${source.type}`);
        if (source.url) lines.push(`- URL: ${source.url}`);
        if (source.provider) lines.push(`- Provider: ${source.provider}`);
        lines.push("");
        lines.push(source.summary || source.content || "No summary captured.");
        lines.push("");
      });
    }

    lines.push("## Startup Pack");
    lines.push("");
    workspace.artifacts.forEach((artifact) => {
      const content = this.getArtifactContent(artifact);
      lines.push(`### ${artifact.title}`);
      lines.push("");
      if (artifact.imageUrl) {
        lines.push(`Image: ${artifact.imageUrl}`);
        lines.push("");
      }
      lines.push(content || "Not generated yet.");
      lines.push("");
    });

    if (workspace.rehearsalSessions.length > 0) {
      const latest = workspace.rehearsalSessions[0];
      lines.push("## Latest Rehearsal");
      lines.push("");
      lines.push("### Transcript");
      lines.push(latest.transcript || "Not available");
      lines.push("");
      lines.push("### Critique");
      lines.push(latest.critique || "Not available");
      lines.push("");
      lines.push("### Improved Script");
      lines.push(latest.improvedScript || "Not available");
      lines.push("");
    }

    return lines.join("\n");
  }
}
