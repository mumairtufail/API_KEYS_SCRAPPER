import { Nav } from "@/components/Nav";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const PROVIDERS = [
  {
    name: "OpenAI",
    pattern: "sk-proj-... / sk-...T3BlbkFJ...",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200/60",
    description:
      "Grants full access to GPT models under the key owner's account. A leaked key can be used to generate completions, embeddings, images, and more, all billed to the owner.",
  },
  {
    name: "Anthropic / Claude",
    pattern: "sk-ant-... / sk-ant-api03-...",
    color: "bg-orange-100 text-orange-800 border-orange-200/60",
    description:
      "Grants access to Claude models via the Anthropic API. Misuse can rack up usage-based charges and, depending on scopes, expose account/organization data.",
  },
  {
    name: "Google Gemini",
    pattern: "AIza...",
    color: "bg-blue-100 text-blue-800 border-blue-200/60",
    description:
      "Grants access to Gemini models through Google AI Studio or Vertex AI. Depending on how the key is scoped, it may also reach other Google Cloud APIs.",
  },
];

const RISKS = [
  "Anyone who finds a leaked key can start using it immediately — no additional verification required.",
  "Usage is billed to the key's owner, so a leaked key can cause significant, unexpected financial loss.",
  "Keys often remain valid for days or weeks after being leaked, since owners rarely monitor for exposure.",
  "Automated scanners and bad actors actively crawl public GitHub for these exact patterns, so exposure windows are exploited fast.",
];

export default function AboutKeysPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      {/* Top Navbar */}
      <Nav />

      {/* Content Container */}
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">
            API Keys Overview
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            What each key type grants access to, and why exposure matters.
          </p>
        </div>

        <div className="space-y-4">
          {PROVIDERS.map((p) => (
            <div key={p.name} className="glass-panel rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2.5 mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800 font-sans">{p.name}</h3>
                <Badge variant="outline" className={p.color}>
                  {p.pattern}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{p.description}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-sm border-amber-250 bg-amber-50/10">
          <div className="flex items-center gap-2 mb-3 border-b border-amber-100 pb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800 font-sans">
              Why Exposure Is Dangerous
            </h3>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-xs text-slate-655 font-medium leading-relaxed">
            {RISKS.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
