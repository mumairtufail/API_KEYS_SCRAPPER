import { NextRequest, NextResponse } from "next/server";
import { runScan, DEFAULT_QUERIES, GitHubRateLimitError } from "@/lib/github";
import {
  startScan,
  updateProgress,
  addFinding,
  finishScan,
  failScan,
  getScan,
} from "@/lib/cache";
import { saveScan, getSetting } from "@/lib/db";

// Runs on the Node.js runtime (background work).
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  let token: string | undefined = typeof body?.token === "string" && body.token ? body.token : undefined;
  if (!token) {
    token = getSetting("github_token");
  }

  const id = crypto.randomUUID();
  startScan(id, DEFAULT_QUERIES);

  // Run the scan asynchronously in the background
  void runScan(
    DEFAULT_QUERIES,
    token,
    (progress) => updateProgress(id, progress),
    (finding) => addFinding(id, finding)
  )
    .then(() => {
      finishScan(id);
      const finished = getScan(id);
      if (finished) {
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
  const state = id ? getScan(id) : undefined;

  if (!state) {
    return NextResponse.json({ id: null, status: "idle", progress: null, findings: [], error: null });
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
