import { NextRequest, NextResponse } from "next/server";
import { runScan, DEFAULT_QUERIES, GitHubRateLimitError } from "@/lib/github";
import {
  startScan,
  updateProgress,
  addFinding,
  finishScan,
  failScan,
  getCurrentScan,
  getScan,
  isScanRunning,
} from "@/lib/cache";
import { saveScan, getSetting } from "@/lib/db";

// Runs on the Node.js runtime (better-sqlite3, long-running background work).
export const runtime = "nodejs";

/**
 * Kicks off a scan in the background and returns immediately with a scan id.
 * NOTE: this relies on the Node process staying alive after the response is
 * sent, which holds on a persistent server (`next start` / self-hosted /
 * Docker) but is NOT guaranteed on pure serverless platforms that freeze
 * the function once the response completes. Deploy this on a long-running
 * Node process for the background scan to finish reliably.
 */
export async function POST(request: NextRequest) {
  if (isScanRunning()) {
    return NextResponse.json({ error: "A scan is already running" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  let token: string | undefined = typeof body?.token === "string" && body.token ? body.token : undefined;
  if (!token) {
    token = getSetting("github_token");
  }

  const id = crypto.randomUUID();
  startScan(id, DEFAULT_QUERIES);

  void runScan(
    DEFAULT_QUERIES,
    token,
    (progress) => updateProgress(id, progress),
    (finding) => addFinding(id, finding)
  )
    .then(() => {
      finishScan(id);
      const finished = getCurrentScan();
      if (finished && finished.id === id) {
        saveScan({
          id: finished.id,
          timestamp: finished.startedAt,
          queryUsed: finished.queriesUsed,
          findings: finished.findings,
          totalFound: finished.findings.length,
        });
      }
    })
    .catch((err) => {
      const message = err instanceof GitHubRateLimitError ? "GitHub rate limit hit — try again shortly, or add a token." : err instanceof Error ? err.message : "Unknown scan error";
      failScan(id, message);
    });

  return NextResponse.json({ scanId: id });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const state = id ? getScan(id) : getCurrentScan();

  if (!state) {
    // No scan has ever been started (e.g. first dashboard load) — this is
    // the normal initial state, not an error, so return 200 with "idle".
    if (!id) {
      return NextResponse.json({ id: null, status: "idle", progress: null, findings: [], error: null });
    }
    return NextResponse.json({ error: "No scan found" }, { status: 404 });
  }

  return NextResponse.json({
    id: state.id,
    status: state.status,
    progress: state.progress,
    findings: state.findings,
    error: state.error,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
  });
}
