"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { LogoIcon } from "./LogoIcon";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
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
    <div className="relative w-full max-w-md">
      <div className="glass-panel relative rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <LogoIcon className="h-16 w-16 text-[#5b7060]" />
          <div className="mt-2">
            <h1 className="text-2xl font-extrabold tracking-wider text-slate-800 uppercase font-sans">
              AK_SCANNER
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Internal Security Dashboard &bull; Sign in
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-750 font-sans">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@gmail.com"
              className="glass-input h-11 rounded-xl px-3.5 text-sm text-[#0f172a]"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-slate-750 font-sans">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="glass-input h-11 rounded-xl px-3.5 text-sm text-[#0f172a]"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground rounded-xl py-3">
              <AlertDescription className="text-xs">{error}</AlertDescription>
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
