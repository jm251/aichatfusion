import { FirebaseService } from "./firebase-service";
import type {
  LocalGrowthAsset,
  LocalGrowthAssetType,
  OrganizationWorkspace,
} from "./local-growth-types";

const STORAGE_PREFIX = "local-growth-os-workspaces";

function sortByUpdatedAtDesc(
  workspaces: OrganizationWorkspace[],
): OrganizationWorkspace[] {
  return [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt);
}

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readLocalWorkspaces(userId: string): OrganizationWorkspace[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortByUpdatedAtDesc(parsed as OrganizationWorkspace[]);
  } catch (error) {
    console.error("Failed to read local growth workspaces from localStorage:", error);
    return [];
  }
}

function writeLocalWorkspaces(
  userId: string,
  workspaces: OrganizationWorkspace[],
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(sortByUpdatedAtDesc(workspaces)),
    );
  } catch (error) {
    console.error("Failed to write local growth workspaces to localStorage:", error);
  }
}

function mergeWorkspaces(
  primary: OrganizationWorkspace[],
  secondary: OrganizationWorkspace[],
): OrganizationWorkspace[] {
  const merged = new Map<string, OrganizationWorkspace>();

  [...secondary, ...primary].forEach((workspace) => {
    const current = merged.get(workspace.id);
    if (!current || workspace.updatedAt >= current.updatedAt) {
      merged.set(workspace.id, workspace);
    }
  });

  return sortByUpdatedAtDesc(Array.from(merged.values()));
}

export class LocalGrowthWorkspaceStorage {
  static async listWorkspaces(userId: string): Promise<OrganizationWorkspace[]> {
    const local = readLocalWorkspaces(userId);

    if (FirebaseService.getStorageMode() !== "cloud") {
      return local;
    }

    const remote = await FirebaseService.getLocalGrowthWorkspaces(userId);
    const merged = mergeWorkspaces(remote, local);
    writeLocalWorkspaces(userId, merged);
    return merged;
  }

  static async saveWorkspace(
    userId: string,
    workspace: OrganizationWorkspace,
  ): Promise<void> {
    const existing = readLocalWorkspaces(userId);
    const next = existing.filter((item) => item.id !== workspace.id);
    next.unshift(workspace);
    writeLocalWorkspaces(userId, next);

    if (FirebaseService.getStorageMode() === "cloud") {
      await FirebaseService.saveLocalGrowthWorkspace(userId, workspace);
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
      await FirebaseService.deleteLocalGrowthWorkspace(userId, workspaceId);
    }
  }

  static getAsset(
    workspace: OrganizationWorkspace,
    assetType: LocalGrowthAssetType,
  ): LocalGrowthAsset | undefined {
    return workspace.assets.find((asset) => asset.type === assetType);
  }

  static getAssetContent(asset?: LocalGrowthAsset): string {
    if (!asset || !asset.currentVersionId) return "";

    return (
      asset.versions.find((version) => version.id === asset.currentVersionId)?.content || ""
    );
  }

  static exportWorkspaceMarkdown(workspace: OrganizationWorkspace): string {
    const lines: string[] = [];
    lines.push(`# ${workspace.brand.clientName || workspace.name}`);
    lines.push("");
    lines.push(`Updated: ${new Date(workspace.updatedAt).toLocaleString()}`);
    lines.push("");
    lines.push("## Brand");
    lines.push("");
    lines.push(`- Website: ${workspace.brand.websiteUrl || "Not set"}`);
    lines.push(`- Vertical: ${workspace.brand.vertical || "Not set"}`);
    lines.push(`- Audience: ${workspace.brand.targetAudience || "Not set"}`);
    lines.push(`- Core Offer: ${workspace.brand.coreOffer || "Not set"}`);
    lines.push(`- Goals: ${workspace.brand.goals || "Not set"}`);
    lines.push("");
    lines.push("### Differentiators");
    lines.push(workspace.brand.differentiators || "Not set");
    lines.push("");
    lines.push("### Proof Points");
    lines.push(workspace.brand.proofPoints || "Not set");
    lines.push("");
    lines.push("## Locations");
    lines.push("");

    if (workspace.locations.length === 0) {
      lines.push("No locations yet.");
      lines.push("");
    } else {
      workspace.locations.forEach((location) => {
        lines.push(`### ${location.name || "Untitled location"}`);
        lines.push(
          `- Address: ${[
            location.addressLine,
            location.city,
            location.region,
            location.postalCode,
            location.country,
          ]
            .filter(Boolean)
            .join(", ") || "Not set"}`,
        );
        lines.push(`- Radius: ${location.serviceRadiusKm} km`);
        if (location.coordinates) {
          lines.push(`- Coordinates: ${location.coordinates.lat}, ${location.coordinates.lng}`);
        }
        lines.push("");
      });
    }

    lines.push("## Market Intel Sources");
    lines.push("");
    if (workspace.sources.length === 0) {
      lines.push("No sources yet.");
      lines.push("");
    } else {
      workspace.sources.forEach((source) => {
        lines.push(`### ${source.title}`);
        lines.push(`- Type: ${source.type}`);
        if (source.url) lines.push(`- URL: ${source.url}`);
        if (source.provider) lines.push(`- Provider: ${source.provider}`);
        lines.push("");
        lines.push(source.summary || source.content || "No summary available.");
        lines.push("");
      });
    }

    lines.push("## Competitors");
    lines.push("");
    if (workspace.competitors.length === 0) {
      lines.push("No competitors yet.");
      lines.push("");
    } else {
      workspace.competitors.forEach((competitor) => {
        lines.push(`### ${competitor.name}`);
        if (competitor.url) lines.push(`- URL: ${competitor.url}`);
        if (competitor.distanceKm !== undefined) {
          lines.push(`- Distance: ${competitor.distanceKm.toFixed(1)} km`);
        }
        lines.push(`- Pricing Signal: ${competitor.pricingSignal || "Unknown"}`);
        lines.push("");
        lines.push(competitor.summary || "No summary available.");
        lines.push("");
      });
    }

    lines.push("## Assets");
    lines.push("");
    workspace.assets.forEach((asset) => {
      lines.push(`### ${asset.title}`);
      lines.push("");
      if (asset.imageUrl) {
        lines.push(`Image: ${asset.imageUrl}`);
        lines.push("");
      }
      if (asset.audioUrl) {
        lines.push(`Audio: ${asset.audioUrl}`);
        lines.push("");
      }
      lines.push(this.getAssetContent(asset) || "Not generated yet.");
      lines.push("");
    });

    return lines.join("\n");
  }
}
