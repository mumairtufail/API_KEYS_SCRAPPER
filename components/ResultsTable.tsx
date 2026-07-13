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
import { ExternalLink, Copy, Check, Star, GitBranch, FileText } from "lucide-react";
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
      className="p-1 rounded text-zinc-400 hover:text-[#606c38] hover:bg-[#606c38]/5 transition-colors cursor-pointer"
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

export function ResultsTable({ findings, favorites = [], onToggleFavorite }: ResultsTableProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#606c38]/15 bg-white/10 p-12 text-center text-sm text-zinc-500">
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
    <div className="rounded-xl border border-[#606c38]/15 bg-white/20 overflow-x-auto shadow-sm">
      <Table>
        <TableHeader className="bg-[#606c38]/5">
          <TableRow className="border-b border-[#606c38]/10">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="text-[#606c38] font-bold text-xs uppercase tracking-wider">Provider</TableHead>
            <TableHead className="text-[#606c38] font-bold text-xs uppercase tracking-wider">Repository</TableHead>
            <TableHead className="text-[#606c38] font-bold text-xs uppercase tracking-wider">File Path</TableHead>
            <TableHead className="text-[#606c38] font-bold text-xs uppercase tracking-wider">Key Preview</TableHead>
            <TableHead className="text-[#606c38] font-bold text-xs uppercase tracking-wider">Context</TableHead>
            <TableHead className="text-[#606c38] font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((f, i) => {
            const isFav = isFavorite(f);
            const copyText = f.rawKey || f.keyPreview;
            return (
              <TableRow
                key={`${f.fileUrl}-${f.keyPreview}-${i}`}
                className="border-b border-[#606c38]/10 hover:bg-white/40 transition-colors"
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
                      "font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-md",
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
                    className="inline-flex items-center gap-1 hover:text-[#606c38] hover:underline transition-colors"
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
                    className="inline-flex items-center gap-1 hover:text-[#606c38] hover:underline transition-colors"
                    title={f.file}
                  >
                    <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span>{f.file.split("/").pop()}</span>
                  </a>
                </TableCell>

                {/* Key Preview & Copy */}
                <TableCell className="py-3 font-mono text-[11px] text-zinc-800 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>{f.keyPreview}</span>
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
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#606c38] hover:text-[#4d572d] hover:underline transition-colors"
                  >
                    View Source <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
