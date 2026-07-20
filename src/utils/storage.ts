// ============================================================
// Enhanced Browser Storage Service
// ============================================================
import type { Project } from "../types";

export const STORAGE_KEY = "spreadsheet-storage";
export const STORAGE_VERSION = 1;

export interface StorageData {
  version: number;
  projects: Project[];
  activeProjectId: string | null;
  lastSaved: string;
}

export interface StorageStats {
  usedBytes: number;
  totalBytes: number | null;
  usagePercent: number | null;
  keyCount: number;
}

/**
 * Serialize and persist project data to localStorage with version stamp.
 * Returns true on success, false on failure (e.g., quota exceeded).
 */
export function saveData(
  projects: Project[],
  activeProjectId: string | null,
): boolean {
  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      projects,
      activeProjectId,
      lastSaved: new Date().toISOString(),
    };
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
    return false;
  }
}

/**
 * Load and deserialize project data from localStorage.
 * Runs version migrations if needed. Returns null if no data exists.
 */
export function loadData(): {
  projects: Project[];
  activeProjectId: string | null;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // Handle unversioned (legacy) data
    if (data.version === undefined) {
      return migrateV0ToV1(data);
    }

    // Current version — just validate and return
    if (data.version === STORAGE_VERSION && data.projects) {
      return {
        projects: data.projects,
        activeProjectId: data.activeProjectId ?? null,
      };
    }

    // Future version — attempt best-effort load
    console.warn(
      `Storage version ${data.version} is newer than supported (${STORAGE_VERSION}). Attempting load.`,
    );
    return {
      projects: data.projects ?? [],
      activeProjectId: data.activeProjectId ?? null,
    };
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
    return null;
  }
}

/**
 * Migrate unversioned (v0) data to v1 format.
 */
function migrateV0ToV1(data: Record<string, unknown>): {
  projects: Project[];
  activeProjectId: string | null;
} {
  const projects = (data.projects as Project[]) ?? [];
  const migrated = projects.map((p) => ({
    ...p,
    sheets: p.sheets.map((s) => ({
      ...s,
      mergedCells: s.mergedCells ?? [],
    })),
  }));
  return {
    projects: migrated,
    activeProjectId: (data.activeProjectId as string) ?? null,
  };
}

/**
 * Clear all spreadsheet data from localStorage.
 */
export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get storage usage statistics.
 * Uses the Storage API if available, otherwise estimates based on string length.
 */
export function getStorageStats(): StorageStats {
  let usedBytes = 0;
  let keyCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keyCount++;
      const value = localStorage.getItem(key) ?? "";
      usedBytes += new Blob([key + value]).size;
    }
  }

  // Try to get total quota from Storage API
  let totalBytes: number | null = null;
  let usagePercent: number | null = null;

  if ("storage" in navigator && "estimate" in navigator.storage) {
    // We can't call estimate() synchronously, so this is a best-effort
    // that gets populated asynchronously on first call
    navigator.storage.estimate().then((estimate) => {
      if (estimate.quota && estimate.usage) {
        totalBytes = estimate.quota;
        usagePercent = (estimate.usage / estimate.quota) * 100;
      }
    });
  }

  // Fallback: typical localStorage limit is ~5MB
  if (totalBytes === null) {
    totalBytes = 5 * 1024 * 1024; // 5MB typical limit
    usagePercent = (usedBytes / totalBytes) * 100;
  }

  return {
    usedBytes,
    totalBytes,
    usagePercent: Math.round((usagePercent ?? 0) * 100) / 100,
    keyCount,
  };
}

/**
 * Check if storage is nearing quota (>90% used).
 */
export function isStorageNearQuota(): boolean {
  const stats = getStorageStats();
  return (stats.usagePercent ?? 0) > 90;
}

/**
 * Trigger a browser file download from a Blob.
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker dialog and return the selected File.
 * Returns null if user cancelled.
 */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      resolve(file);
    });

    input.addEventListener("cancel", () => {
      document.body.removeChild(input);
      resolve(null);
    });

    // Handle the case where user closes dialog without selecting
    // We use a focus listener as a heuristic
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      setTimeout(() => {
        if (input.parentNode) {
          document.body.removeChild(input);
          resolve(null);
        }
      }, 300);
    };
    window.addEventListener("focus", onFocus);

    input.click();
  });
}

/**
 * Read a File as text (UTF-8).
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Read a File as ArrayBuffer.
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
