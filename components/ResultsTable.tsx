"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, Star, GitBranch, FileText, Loader2 } from "lucide-react";
import type { RawFinding } from "@/lib/github";
import { cn } from "@/lib/utils";

const PROVIDER_VARIANT: Record<string, string> = {
  openai: "bg-emerald-100 text-emerald-800 border-emerald-200/60",
  anthropic: "bg-orange-100 text-orange-800 border-orange-200/60",
  gemini: "bg-blue-100 text-blue-800 border-blue-200/60",
  generic: "bg-zinc-100 text-zinc-800 border-zinc-200/60",
};

interface ResultsTableProps {
  findings: RawFinding[];
  favorites?: RawFinding[];
  onToggleFavorite?: (finding: RawFinding) => void;
  running?: boolean;
}

function CopyButton({ text }: { text: string }) {
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
      className="p-1 rounded text-zinc-400 hover:text-[#5b7060] hover:bg-[#5b7060]/5 transition-colors cursor-pointer"
      title="Copy raw key"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function TableSkeletonRow() {
  return (
    <TableRow className="border-b border-slate-100 animate-pulse bg-slate-50/20">
      {/* Favorite Star placeholder */}
      <TableCell className="py-4 pl-4 w-[40px]">
        <div className="h-4 w-4 bg-zinc-200 rounded" />
      </TableCell>

      {/* Provider Badge placeholder */}
      <TableCell className="py-4">
        <div className="h-5 w-16 bg-zinc-200 rounded-md" />
      </TableCell>

      {/* Repo placeholder */}
      <TableCell className="py-4 max-w-[160px]">
        <div className="h-3.5 w-24 bg-zinc-200 rounded" />
      </TableCell>

      {/* File Path placeholder */}
      <TableCell className="py-4 max-w-[180px]">
        <div className="h-3.5 w-28 bg-zinc-200 rounded" />
      </TableCell>

      {/* Key Preview placeholder */}
      <TableCell className="py-4">
        <div className="h-3.5 w-32 bg-zinc-200 rounded font-mono" />
      </TableCell>

      {/* Context placeholder */}
      <TableCell className="py-4 max-w-[280px]">
        <div className="h-3.5 w-44 bg-zinc-200 rounded" />
      </TableCell>

      {/* View Source placeholder */}
      <TableCell className="py-4 text-right pr-4">
        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-300">
          Scanning... <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ResultsTable({ findings, favorites = [], onToggleFavorite, running = false }: ResultsTableProps) {
  if (findings.length === 0 && !running) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/10 p-12 text-center text-sm text-zinc-500 font-sans">
        No findings detected. Start a new scan or load previous scan history.
      </div>
    );
  }

  const isFavorite = (finding: RawFinding) => {
    return favorites.some(
      (fav) => fav.fileUrl === finding.fileUrl && fav.keyPreview === finding.keyPreview
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/20 overflow-x-auto shadow-sm">
      <Table>
        <TableHeader className="bg-[#5b7060]/5">
          <TableRow className="border-b border-slate-200">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="text-slate-700 font-bold text-xs uppercase tracking-wider font-sans">Provider</TableHead>
            <TableHead className="text-slate-700 font-bold text-xs uppercase tracking-wider font-sans">Repository</TableHead>
            <TableHead className="text-slate-700 font-bold text-xs uppercase tracking-wider font-sans">File Path</TableHead>
            <TableHead className="text-slate-700 font-bold text-xs uppercase tracking-wider font-sans">Key Preview</TableHead>
            <TableHead className="text-slate-700 font-bold text-xs uppercase tracking-wider font-sans">Context</TableHead>
            <TableHead className="text-slate-700 font-bold text-xs uppercase tracking-wider text-right font-sans">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((f, i) => {
            const isFav = isFavorite(f);
            const copyText = f.rawKey || f.keyPreview;
            return (
              <TableRow
                key={`${f.fileUrl}-${f.keyPreview}-${i}`}
                className="border-b border-slate-100 hover:bg-white/40 transition-colors"
              >
                {/* Favorite Star Icon */}
                <TableCell className="py-3 pl-4">
                  {onToggleFavorite && (
                    <button
                      onClick={() => onToggleFavorite(f)}
                      className="p-1 rounded text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                      title={isFav ? "Remove from bookmarks" : "Add to bookmarks"}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-all duration-200",
                          isFav ? "text-amber-500 fill-amber-500 scale-110" : "text-zinc-400 hover:scale-105"
                        )}
                      />
                    </button>
                  )}
                </TableCell>

                {/* Provider Badge */}
                <TableCell className="py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-md font-sans",
                      PROVIDER_VARIANT[f.providerId] ?? PROVIDER_VARIANT.generic
                    )}
                  >
                    {f.providerName}
                  </Badge>
                </TableCell>

                {/* Repo link & icon */}
                <TableCell className="py-3 max-w-[160px] truncate font-mono text-[11px] text-zinc-700">
                  <a
                    href={f.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#5b7060] hover:underline transition-colors font-mono"
                    title={f.repo}
                  >
                    <GitBranch className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span>{f.repo.split("/")[1] || f.repo}</span>
                  </a>
                </TableCell>

                {/* File link & icon */}
                <TableCell className="py-3 max-w-[180px] truncate font-mono text-[11px] text-zinc-600">
                  <a
                    href={f.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#5b7060] hover:underline transition-colors font-mono"
                    title={f.file}
                  >
                    <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span>{f.file.split("/").pop()}</span>
                  </a>
                </TableCell>

                {/* Key Preview & Copy */}
                <TableCell className="py-3 font-mono text-[11px] text-zinc-800 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{f.keyPreview}</span>
                    <CopyButton text={copyText} />
                  </div>
                </TableCell>

                {/* Match Context snippet */}
                <TableCell
                  className="py-3 max-w-[280px] truncate text-[11px] text-zinc-500 font-mono"
                  title={f.context}
                >
                  {f.context}
                </TableCell>

                {/* Open File Link */}
                <TableCell className="py-3 text-right pr-4">
                  <a
                    href={f.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5b7060] hover:text-[#4a5b4e] hover:underline transition-colors font-sans"
                  >
                    View Source <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}

          {/* Render animated skeletons at the bottom of the table if scanning */}
          {running && (
            <>
              <TableSkeletonRow />
              <TableSkeletonRow />
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
