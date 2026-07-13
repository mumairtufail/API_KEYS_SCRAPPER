"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck } from "lucide-react";
import { LogoIcon } from "./LogoIcon";

export function LoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Authentication failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Authentication request failed", err);
      setError(err?.message ?? "An unexpected connection error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="glass-panel relative rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <LogoIcon className="h-16 w-16 text-[#5b7060]" />
          <div className="mt-2">
            <h1 className="text-2xl font-extrabold tracking-wider text-slate-800 uppercase font-sans">
              AK_SCANNER
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#5b7060]" />
              Secure Security Gate
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pin" className="text-xs font-bold uppercase tracking-widest text-slate-700 font-sans">
                Enter Security PIN
              </Label>
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">6 Digits</span>
            </div>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="••••••"
              className="glass-input h-12 rounded-xl text-center font-mono text-xl tracking-[0.75em] pl-[0.75em] text-[#0f172a]"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground rounded-xl py-3">
              <AlertDescription className="text-xs text-center font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-[#5b7060] hover:bg-[#4a5b4e] text-white font-bold uppercase tracking-wider text-xs shadow-md shadow-[#5b7060]/10 rounded-2xl transition-all duration-200 disabled:opacity-50 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Enter Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
}
