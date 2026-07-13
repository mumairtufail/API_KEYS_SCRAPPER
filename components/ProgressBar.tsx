"use client";

import { Progress } from "@/components/ui/progress";
import type { ScanProgress } from "@/lib/github";
import { Loader2 } from "lucide-react";

export function ProgressBar({ progress }: { progress: ScanProgress }) {
  const queryPct = progress.totalQueries > 0 ? (progress.queryIndex / progress.totalQueries) * 100 : 0;
  const filePct = progress.totalFiles > 0 ? (progress.filesScanned / progress.totalFiles) * 100 : 0;
  const overallPct = progress.filesScanned > 0 ? filePct : queryPct;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          Query {Math.min(progress.queryIndex, progress.totalQueries)}/{progress.totalQueries}
          {progress.totalFiles > 0 && (
            <>
              {" "}
              &middot; File {progress.filesScanned}/{progress.totalFiles}
            </>
          )}
        </span>
      </div>
      <Progress value={overallPct} />
    </div>
  );
}
