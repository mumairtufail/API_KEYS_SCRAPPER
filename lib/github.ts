// GitHub Code Search integration: runs the search queries, fetches raw file
// content for each hit, and hands text off to the pattern matcher.

import axios, { AxiosError } from "axios";
import { scanContent, maskKey } from "./patterns";

const GITHUB_API = "https://api.github.com";
const SEARCH_DELAY_MS = 1000; // fast search pacing
const FETCH_DELAY_MS = 30; // 10x faster file fetches
const RESULTS_PER_QUERY = 30; // first page only, keeps a scan bounded

export const DEFAULT_QUERIES = [
  'sk-proj- OR sk-ant- OR AIza filename:.env OR filename:.env.local OR filename:config',
  '"OPENAI_API_KEY" OR "ANTHROPIC_API_KEY" OR "GEMINI_API_KEY" OR "CLAUDE_API_KEY"',
  "sk- language:python OR language:javascript OR language:typescript OR language:go",
  "filename:.env sk- OR AIza",
];

const TEXT_EXTENSIONS = new Set([
  "env", "js", "ts", "jsx", "tsx", "py", "go", "rb", "java", "php", "json",
  "yml", "yaml", "toml", "ini", "cfg", "conf", "txt", "md", "sh", "bash",
  "env.local", "example", "sample", "properties", "gradle",
]);

export interface GitHubSearchItem {
  name: string;
  path: string;
  html_url: string;
  repository: { full_name: string; html_url: string };
}

export class GitHubRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("GitHub API rate limit exceeded");
    this.name = "GitHubRateLimitError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authHeaders(token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-key-scanner-internal-tool",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function isTextFile(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.endsWith(".env") || lower.includes(".env.")) return true;
  const ext = lower.split(".").pop() ?? "";
  return TEXT_EXTENSIONS.has(ext);
}

async function handleGitHubError(err: unknown): Promise<never> {
  const axiosErr = err as AxiosError;
  if (axiosErr.response?.status === 401) {
    throw new Error("GitHub's code search API requires authentication — enter a personal access token above.");
  }
  if (axiosErr.response?.status === 403 || axiosErr.response?.status === 429) {
    const resetHeader = axiosErr.response.headers?.["x-ratelimit-reset"];
    const retryAfterHeader = axiosErr.response.headers?.["retry-after"];
    let retryAfterMs = 60_000;
    if (retryAfterHeader) {
      retryAfterMs = Number(retryAfterHeader) * 1000;
    } else if (resetHeader) {
      retryAfterMs = Math.max(0, Number(resetHeader) * 1000 - Date.now());
    }
    throw new GitHubRateLimitError(retryAfterMs);
  }
  throw err instanceof Error ? err : new Error("Unknown GitHub API error");
}

export async function searchCode(query: string, token?: string): Promise<GitHubSearchItem[]> {
  try {
    const res = await axios.get(`${GITHUB_API}/search/code`, {
      headers: authHeaders(token),
      params: { q: query, per_page: RESULTS_PER_QUERY },
      timeout: 15_000,
      validateStatus: (s) => s === 200,
    });
    return res.data.items ?? [];
  } catch (err) {
    return handleGitHubError(err);
  }
}

function toRawUrl(htmlUrl: string): string {
  // https://github.com/{owner}/{repo}/blob/{ref}/{path} -> raw.githubusercontent.com
  return htmlUrl
    .replace("https://github.com/", "https://raw.githubusercontent.com/")
    .replace("/blob/", "/");
}

export async function fetchRawContent(item: GitHubSearchItem): Promise<string | null> {
  if (!isTextFile(item.path)) return null;
  try {
    const res = await axios.get(toRawUrl(item.html_url), {
      timeout: 15_000,
      responseType: "text",
      transformResponse: (data) => data,
      validateStatus: (s) => s === 200,
      maxContentLength: 2 * 1024 * 1024, // 2MB cap, skip huge blobs
    });
    return typeof res.data === "string" ? res.data : null;
  } catch {
    return null; // missing/binary/oversized files are skipped, not fatal
  }
}

export interface ScanProgress {
  queryIndex: number;
  totalQueries: number;
  filesScanned: number;
  totalFiles: number;
}

export interface RawFinding {
  providerId: string;
  providerName: string;
  repo: string;
  repoUrl: string;
  file: string;
  fileUrl: string;
  keyPreview: string;
  rawKey?: string;
  context: string;
  confidence: number;
}

/**
 * Runs every query in `queries` against GitHub code search, fetches each hit,
 * and reports incremental progress + findings via callbacks so callers can
 * stream state into the shared in-memory scan cache.
 */
export async function runScan(
  queries: string[],
  token: string | undefined,
  onProgress: (progress: ScanProgress) => void,
  onFinding: (finding: RawFinding) => void
): Promise<void> {
  const seen = new Set<string>();
  let totalFilesEstimate = 0;
  let filesScannedCount = 0;

  for (let q = 0; q < queries.length; q++) {
    // Report initial progress for this query search
    onProgress({
      queryIndex: q + 1,
      totalQueries: queries.length,
      filesScanned: filesScannedCount,
      totalFiles: totalFilesEstimate,
    });

    const items = await searchCode(queries[q], token);
    const uniqueItemsInQuery = items.filter((item) => {
      if (seen.has(item.html_url)) return false;
      seen.add(item.html_url);
      return true;
    });

    totalFilesEstimate += uniqueItemsInQuery.length;

    // Immediately scan files returned by this query
    for (let i = 0; i < uniqueItemsInQuery.length; i++) {
      const item = uniqueItemsInQuery[i];
      onProgress({
        queryIndex: q + 1,
        totalQueries: queries.length,
        filesScanned: filesScannedCount,
        totalFiles: totalFilesEstimate,
      });

      const content = await fetchRawContent(item);
      if (content) {
        const findings = scanContent(content);
        for (const f of findings) {
          onFinding({
            providerId: f.providerId,
            providerName: f.providerName,
            repo: item.repository.full_name,
            repoUrl: item.repository.html_url,
            file: item.path,
            fileUrl: item.html_url,
            keyPreview: maskKey(f.match),
            rawKey: f.match,
            context: f.context,
            confidence: f.confidence,
          });
        }
      }
      filesScannedCount++;

      if (i < uniqueItemsInQuery.length - 1) {
        await sleep(FETCH_DELAY_MS);
      }
    }

    if (q < queries.length - 1) {
      await sleep(SEARCH_DELAY_MS);
    }
  }

  // Final progress update
  onProgress({
    queryIndex: queries.length,
    totalQueries: queries.length,
    filesScanned: filesScannedCount,
    totalFiles: totalFilesEstimate,
  });
}
