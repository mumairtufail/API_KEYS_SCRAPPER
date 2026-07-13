"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ScanButton } from "@/components/ScanButton";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultsTable } from "@/components/ResultsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { RawFinding, ScanProgress } from "@/lib/github";
import type { ScanHistoryEntry } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { Star, History, Trash2, Copy, Check, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ScanStatus = "idle" | "running" | "done" | "error";

const POLL_INTERVAL_MS = 500;

const PROVIDER_VARIANT: Record<string, string> = {
  openai: "bg-emerald-100 text-emerald-800 border-emerald-200/60",
  anthropic: "bg-orange-100 text-orange-800 border-orange-200/60",
  gemini: "bg-blue-100 text-blue-800 border-blue-200/60",
  generic: "bg-zinc-100 text-zinc-800 border-zinc-200/60",
};

function SidebarCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md text-zinc-400 hover:text-[#5b7060] hover:bg-[#5b7060]/5 transition-colors cursor-pointer"
      title="Copy raw key"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState<ScanProgress>({ queryIndex: 0, totalQueries: 4, filesScanned: 0, totalFiles: 0 });
  const [findings, setFindings] = useState<RawFinding[]>([]);
  const [favorites, setFavorites] = useState<RawFinding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    const res = await fetch("/api/scan/history");
    if (res.ok) {
      const data = await res.json();
      setHistory(data.scans ?? []);
    }
  }, []);

  // Load favorites from local storage on mount
  useEffect(() => {
    const savedFavs = localStorage.getItem("gh_scanner_favorites");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (err) {
        console.error("Failed to parse favorites", err);
      }
    }
  }, []);

  // Handle toggling favorites
  const toggleFavorite = useCallback((finding: RawFinding) => {
    setFavorites((prev) => {
      const exists = prev.some(
        (fav) => fav.fileUrl === finding.fileUrl && fav.keyPreview === finding.keyPreview
      );
      let updated;
      if (exists) {
        updated = prev.filter(
          (fav) => !(fav.fileUrl === finding.fileUrl && fav.keyPreview === finding.keyPreview)
        );
      } else {
        updated = [...prev, finding];
      }
      localStorage.setItem("gh_scanner_favorites", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const poll = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/scan?id=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setProgress(data.progress);
      setFindings(data.findings ?? []);
      if (data.status === "done") {
        setStatus("done");
        stopPolling();
        refreshHistory();
      } else if (data.status === "error") {
        setStatus("error");
        setError(data.error ?? "Scan failed");
        stopPolling();
      }
    },
    [stopPolling, refreshHistory]
  );

  const startScan = useCallback(
    async (token: string) => {
      setError(null);
      setFindings([]);
      setStatus("running");
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to start scan");
        setStatus("error");
        return;
      }
      const data = await res.json();
      scanIdRef.current = data.scanId;
      stopPolling();
      pollRef.current = setInterval(() => poll(data.scanId), POLL_INTERVAL_MS);
    },
    [poll, stopPolling]
  );

  const loadLast = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/scan/last");
    if (!res.ok) {
      setError("No previous scan found");
      return;
    }
    const data = await res.json();
    setFindings(data.scan.findings ?? []);
    setStatus("done");
  }, []);

  const loadFromHistory = useCallback(async (id: string) => {
    setError(null);
    const res = await fetch(`/api/scan/history/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setFindings(data.scan.findings ?? []);
    setStatus("done");
  }, []);

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(findings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-key-scan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [findings]);

  useEffect(() => {
    // Resume polling if a scan is already running (e.g. after a page reload).
    (async () => {
      const res = await fetch("/api/scan");
      if (res.ok) {
        const data = await res.json();
        scanIdRef.current = data.id;
        if (data.progress) setProgress(data.progress);
        setFindings(data.findings ?? []);
        if (data.status === "running") {
          setStatus("running");
          pollRef.current = setInterval(() => poll(data.id), POLL_INTERVAL_MS);
        } else if (data.status === "done") {
          setStatus("done");
        }
      }
      await refreshHistory();
    })();
    return () => stopPolling();
  }, [poll, stopPolling, refreshHistory]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      {/* Top Navbar */}
      <Nav />

      {/* Main Page Grid */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column (Controls + Scan results) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scan Controls Card */}
            <div className="glass-panel rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#5b7060]/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#5b7060]" />
                </div>
                <h2 className="text-xs font-bold text-slate-750 uppercase tracking-widest font-sans">
                  Scan Configuration
                </h2>
              </div>
              
              <ScanButton
                running={status === "running"}
                hasFindings={findings.length > 0}
                onStart={startScan}
                onRefresh={startScan}
                onLoadLast={loadLast}
                onDownload={downloadJson}
              />
              
              {status === "running" && (
                <div className="mt-5 p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <ProgressBar progress={progress} />
                </div>
              )}
              
              {error && (
                <Alert variant="destructive" className="mt-4 bg-red-50 border-red-200 text-red-800 rounded-xl py-3.5">
                  <AlertDescription className="text-xs font-mono">{error}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Results Table Card */}
            <div className="glass-panel rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-5 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#5b7060]/10">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#5b7060]" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-750 uppercase tracking-widest font-sans">
                    Scan Results
                  </h2>
                </div>
                {findings.length > 0 && (
                  <Badge variant="secondary" className="bg-[#5b7060]/10 text-[#5b7060] border border-[#5b7060]/10 font-bold px-2 py-0.5 rounded-md text-[10px] font-mono">
                    {findings.length} Finding{findings.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              
              <ResultsTable
                findings={findings}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          </div>

          {/* Sidebar Column (Bookmarks + History) */}
          <div className="space-y-6">
            {/* Bookmarks/Favorites Sidebar Card */}
            <div className="glass-panel rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 border border-amber-200">
                  <Star className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                </div>
                <h2 className="text-xs font-bold text-slate-750 uppercase tracking-widest font-sans">
                  Bookmarks
                </h2>
              </div>

              {favorites.length === 0 ? (
                <p className="text-xs text-slate-500 leading-relaxed py-2">
                  No bookmarked keys. Click the star icon next to a result to save it here for quick reference across scans.
                </p>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {favorites.map((fav, i) => (
                    <div
                      key={`${fav.fileUrl}-${fav.keyPreview}-${i}`}
                      className="group relative rounded-2xl border border-slate-150 bg-slate-50/50 p-3.5 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[9px] tracking-wide uppercase px-1.5 py-0.5 rounded-md",
                            PROVIDER_VARIANT[fav.providerId] ?? PROVIDER_VARIANT.generic
                          )}
                        >
                          {fav.providerName}
                        </Badge>
                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <SidebarCopyButton text={fav.rawKey || fav.keyPreview} />
                          <button
                            onClick={() => toggleFavorite(fav)}
                            className="p-1 rounded text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remove bookmark"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-mono font-bold text-slate-800 truncate" title={fav.repo}>
                        {fav.repo.split("/")[1] || fav.repo}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate mt-1 flex items-center justify-between">
                        <span className="truncate">{fav.file.split("/").pop()}</span>
                        <a
                          href={fav.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#5b7060] hover:text-[#4a5b4e] inline-flex items-center gap-0.5 shrink-0 pl-2 font-sans font-semibold transition-colors"
                        >
                          Link <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scan History Sidebar Card */}
            <div className="glass-panel rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                  <History className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <h2 className="text-xs font-bold text-slate-750 uppercase tracking-widest font-sans">
                  Scan History
                </h2>
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">No past scans recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {history.slice(0, 10).map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-medium">
                          {formatDistanceToNow(h.timestamp, { addSuffix: true })}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {h.totalFound} finding{h.totalFound === 1 ? "" : "s"}
                        </span>
                      </div>
                      <button
                        onClick={() => loadFromHistory(h.id)}
                        disabled={status === "running"}
                        className="text-[#5b7060] font-bold hover:text-[#4a5b4e] hover:underline transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
