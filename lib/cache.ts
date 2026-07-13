// In-memory state for the currently running (or most recently run) scan.
// Backed by `globalThis` so state survives Next.js dev-server hot reloads.

import type { RawFinding, ScanProgress } from "./github";

export type ScanStatus = "running" | "done" | "error";

export interface ScanState {
  id: string;
  status: ScanStatus;
  startedAt: number;
  finishedAt: number | null;
  queriesUsed: string[];
  progress: ScanProgress;
  findings: RawFinding[];
  error: string | null;
}

interface ScanCache {
  currentId: string | null;
  scans: Map<string, ScanState>;
}

const globalForCache = globalThis as unknown as { __scanCache?: ScanCache };

const cache: ScanCache =
  globalForCache.__scanCache ??
  (globalForCache.__scanCache = { currentId: null, scans: new Map() });

export function startScan(id: string, queriesUsed: string[]): ScanState {
  const state: ScanState = {
    id,
    status: "running",
    startedAt: Date.now(),
    finishedAt: null,
    queriesUsed,
    progress: { queryIndex: 0, totalQueries: queriesUsed.length, filesScanned: 0, totalFiles: 0 },
    findings: [],
    error: null,
  };
  cache.scans.set(id, state);
  cache.currentId = id;
  return state;
}

export function updateProgress(id: string, progress: ScanProgress) {
  const state = cache.scans.get(id);
  if (state) state.progress = progress;
}

export function addFinding(id: string, finding: RawFinding) {
  const state = cache.scans.get(id);
  if (state) state.findings.push(finding);
}

export function finishScan(id: string) {
  const state = cache.scans.get(id);
  if (state) {
    state.status = "done";
    state.finishedAt = Date.now();
  }
}

export function failScan(id: string, error: string) {
  const state = cache.scans.get(id);
  if (state) {
    state.status = "error";
    state.error = error;
    state.finishedAt = Date.now();
  }
}

export function getScan(id: string): ScanState | undefined {
  return cache.scans.get(id);
}

export function getCurrentScan(): ScanState | undefined {
  return cache.currentId ? cache.scans.get(cache.currentId) : undefined;
}

export function isScanRunning(): boolean {
  const current = getCurrentScan();
  return current?.status === "running";
}

export function clearCurrent() {
  cache.currentId = null;
}
