// Regex patterns and confidence scoring for detecting exposed AI provider API keys.

export interface ProviderPattern {
  id: string;
  name: string;
  regex: RegExp;
}

// Order matters: more specific patterns are tried first so that a generic
// "sk-" fallback doesn't shadow a properly identified OpenAI/Anthropic key.
export const PROVIDER_PATTERNS: ProviderPattern[] = [
  {
    id: "openai",
    name: "OpenAI",
    regex: /sk-proj-[a-zA-Z0-9_-]{48,}/g,
  },
  {
    id: "openai",
    name: "OpenAI (legacy)",
    regex: /sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}/g,
  },
  {
    id: "anthropic",
    name: "Anthropic / Claude",
    regex: /sk-ant-[a-zA-Z0-9_-]{32,128}/g,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    regex: /AIza[0-9A-Za-z_-]{35}/g,
  },
  {
    id: "generic",
    name: "Generic AI key",
    regex: /sk-[a-zA-Z0-9]{32,}/g,
  },
];

const CONTEXT_KEYWORDS = [
  "api_key",
  "apikey",
  "api-key",
  "secret",
  "token",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "google_api_key",
  "vertex",
  "ai_studio",
  "bearer",
];

const PLACEHOLDER_HINTS = [
  "example",
  "placeholder",
  "dummy",
  "fake",
  "your_api_key",
  "your-api-key",
  "changeme",
  "sample",
  "xxxxxxxx",
  "insert_key",
  "redacted",
];

export interface Finding {
  providerId: string;
  providerName: string;
  match: string;
  index: number;
  context: string;
  confidence: number;
}

function shannonEntropy(str: string): number {
  const freq = new Map<string, number>();
  for (const ch of str) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isLikelyPlaceholder(match: string, context: string): boolean {
  const lower = context.toLowerCase();
  if (PLACEHOLDER_HINTS.some((hint) => lower.includes(hint))) return true;
  // Reject runs of a single repeated character (e.g. "sk-aaaaaaaa...").
  if (/^(.)\1{10,}$/.test(match.replace(/^[a-z-]+/i, ""))) return true;
  return false;
}

export function extractContext(content: string, index: number, matchLength: number, window = 80): string {
  const start = Math.max(0, index - window);
  const end = Math.min(content.length, index + matchLength + window);
  return content.slice(start, end).replace(/\s+/g, " ").trim();
}

export function maskKey(key: string): string {
  if (key.length <= 12) return `${key.slice(0, 4)}${"*".repeat(Math.max(0, key.length - 4))}`;
  const prefixMatch = key.match(/^[a-zA-Z]+-[a-zA-Z0-9]*-?/);
  const prefix = prefixMatch ? prefixMatch[0] : key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}${"*".repeat(8)}${suffix}`;
}

/** Redacts every occurrence of `secret` inside `text` with its masked form. */
export function redactSecret(text: string, secret: string): string {
  if (!secret) return text;
  return text.split(secret).join(maskKey(secret));
}

export function scanContent(content: string): Finding[] {
  const findings: Finding[] = [];
  const claimedRanges: Array<[number, number]> = [];

  for (const provider of PROVIDER_PATTERNS) {
    const regex = new RegExp(provider.regex.source, provider.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Skip if this range overlaps a match already claimed by a more specific pattern.
      const overlaps = claimedRanges.some(([s, e]) => start < e && end > s);
      if (overlaps) continue;

      const context = extractContext(content, start, match[0].length);
      const entropy = shannonEntropy(match[0]);
      const hasKeyword = CONTEXT_KEYWORDS.some((kw) => context.toLowerCase().includes(kw));
      const placeholder = isLikelyPlaceholder(match[0], context);

      // Generic fallback requires supporting context; specific providers don't.
      if (provider.id === "generic" && !hasKeyword) continue;
      if (placeholder) continue;
      if (entropy < 3.0) continue;

      let confidence = 0.6;
      if (hasKeyword) confidence += 0.25;
      if (entropy > 4.0) confidence += 0.15;
      confidence = Math.min(1, confidence);

      claimedRanges.push([start, end]);
      findings.push({
        providerId: provider.id,
        providerName: provider.name,
        match: match[0],
        index: start,
        context: redactSecret(context, match[0]),
        confidence,
      });
    }
  }

  return findings;
}
