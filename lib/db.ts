import type { RawFinding } from "./github";

export interface SavedScan {
  id: string;
  timestamp: number;
  queryUsed: string[];
  findings: RawFinding[];
  totalFound: number;
}

export interface ScanHistoryEntry {
  id: string;
  timestamp: number;
  queryUsed: string[];
  totalFound: number;
}

// In-memory global cache store (lasts as long as the server process is alive)
const globalStore = globalThis as unknown as {
  __inMemoryScans?: SavedScan[];
  __inMemorySettings?: Record<string, string>;
};

if (!globalStore.__inMemoryScans) {
  globalStore.__inMemoryScans = [];
}
if (!globalStore.__inMemorySettings) {
  globalStore.__inMemorySettings = {};
}

const scans = globalStore.__inMemoryScans;
const settings = globalStore.__inMemorySettings;

export function saveScan(scan: SavedScan): void {
  // Push to history
  scans.unshift(scan);
  // Keep only the last 100 scans in memory to avoid bloat
  if (scans.length > 100) {
    scans.pop();
  }
}

export function getScanById(id: string): SavedScan | undefined {
  return scans.find((s) => s.id === id);
}

export function getLastScan(): SavedScan | undefined {
  return scans[0];
}

export function listScans(limit = 50): ScanHistoryEntry[] {
  return scans.slice(0, limit).map((s) => ({
    id: s.id,
    timestamp: s.timestamp,
    queryUsed: s.queryUsed,
    totalFound: s.totalFound,
  }));
}

// Server-side settings storage (mocked in-memory)
export function getSetting(key: string): string | undefined {
  return settings[key];
}

export function saveSetting(key: string, value: string): void {
  settings[key] = value;
}

export function deleteSetting(key: string): void {
  delete settings[key];
}
