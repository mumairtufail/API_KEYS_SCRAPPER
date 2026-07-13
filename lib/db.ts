import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { RawFinding } from "./github";

const isVercel = !!process.env.VERCEL;
const dataDir = isVercel ? "/tmp" : path.join(process.cwd(), "data");

if (!isVercel && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const globalForDb = globalThis as unknown as { __scanDb?: Database.Database };

const db = globalForDb.__scanDb ?? (globalForDb.__scanDb = new Database(path.join(dataDir, "scans.db")));

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    query_used TEXT NOT NULL,
    findings TEXT NOT NULL,
    total_found INTEGER NOT NULL
  )
`);

export interface SavedScan {
  id: string;
  timestamp: number;
  queryUsed: string[];
  findings: RawFinding[];
  totalFound: number;
}

export function saveScan(scan: SavedScan) {
  db.prepare(
    `INSERT OR REPLACE INTO scans (id, timestamp, query_used, findings, total_found) VALUES (?, ?, ?, ?, ?)`
  ).run(scan.id, scan.timestamp, JSON.stringify(scan.queryUsed), JSON.stringify(scan.findings), scan.totalFound);
}

interface ScanRow {
  id: string;
  timestamp: number;
  query_used: string;
  findings: string;
  total_found: number;
}

function rowToScan(row: ScanRow): SavedScan {
  return {
    id: row.id,
    timestamp: row.timestamp,
    queryUsed: JSON.parse(row.query_used),
    findings: JSON.parse(row.findings),
    totalFound: row.total_found,
  };
}

export function getLastScan(): SavedScan | undefined {
  const row = db.prepare(`SELECT * FROM scans ORDER BY timestamp DESC LIMIT 1`).get() as ScanRow | undefined;
  return row ? rowToScan(row) : undefined;
}

export function getScanById(id: string): SavedScan | undefined {
  const row = db.prepare(`SELECT * FROM scans WHERE id = ?`).get(id) as ScanRow | undefined;
  return row ? rowToScan(row) : undefined;
}

export interface ScanHistoryEntry {
  id: string;
  timestamp: number;
  totalFound: number;
  queryUsed: string[];
}

export function listScans(limit = 50): ScanHistoryEntry[] {
  const rows = db
    .prepare(`SELECT id, timestamp, query_used, total_found FROM scans ORDER BY timestamp DESC LIMIT ?`)
    .all(limit) as Array<Pick<ScanRow, "id" | "timestamp" | "query_used" | "total_found">>;
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    totalFound: row.total_found,
    queryUsed: JSON.parse(row.query_used),
  }));
}

// Server-side settings storage
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

export function getSetting(key: string): string | undefined {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return row?.value;
}

export function saveSetting(key: string, value: string) {
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value);
}

export function deleteSetting(key: string) {
  db.prepare(`DELETE FROM settings WHERE key = ?`).run(key);
}
