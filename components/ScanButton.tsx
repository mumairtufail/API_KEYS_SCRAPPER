"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, RotateCw, History, Download, ShieldCheck, Key, Lock, Unlock } from "lucide-react";

interface ScanControlsProps {
  running: boolean;
  hasFindings: boolean;
  onStart: (token: string) => void;
  onRefresh: (token: string) => void;
  onLoadLast: () => void;
  onDownload: () => void;
}

const STORAGE_KEY = "gh_scanner_token";
const REMEMBER_KEY = "gh_scanner_remember";

export function ScanButton({ running, hasFindings, onStart, onRefresh, onLoadLast, onDownload }: ScanControlsProps) {
  const [token, setToken] = useState("");
  const [rememberToken, setRememberToken] = useState(false);
  const [hasServerToken, setHasServerToken] = useState(false);

  // Check if a token is configured in the settings database
  const checkServerToken = async () => {
    try {
      const res = await fetch("/api/settings?key=github_token");
      if (res.ok) {
        const data = await res.json();
        setHasServerToken(data.hasValue);
      }
    } catch (err) {
      console.error("Failed to check server token", err);
    }
  };

  // Load saved local preference and check token on mount
  useEffect(() => {
    const savedRemember = localStorage.getItem(REMEMBER_KEY) === "true";
    setRememberToken(savedRemember);
    if (savedRemember) {
      const savedToken = localStorage.getItem(STORAGE_KEY);
      if (savedToken) {
        setToken(savedToken);
      }
    }
    checkServerToken();
  }, []);

  const handleTokenChange = (val: string) => {
    setToken(val);
    if (rememberToken) {
      localStorage.setItem(STORAGE_KEY, val);
      // Silently cache on the server database as well
      saveTokenToServer(val);
    }
  };

  const saveTokenToServer = async (val: string) => {
    if (!val) return;
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "github_token", value: val }),
      });
      setHasServerToken(true);
    } catch (err) {
      console.error("Failed to silently cache token on server", err);
    }
  };

  const clearTokenFromServer = async () => {
    try {
      await fetch("/api/settings?key=github_token", {
        method: "DELETE",
      });
      setHasServerToken(false);
    } catch (err) {
      console.error("Failed to silently clear token from server", err);
    }
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberToken(checked);
    localStorage.setItem(REMEMBER_KEY, String(checked));
    if (checked) {
      localStorage.setItem(STORAGE_KEY, token);
      saveTokenToServer(token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      clearTokenFromServer();
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label
            htmlFor="gh-token"
            className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"
          >
            <Key className="h-3.5 w-3.5 text-[#5b7060]" />
            GitHub Personal Access Token (Classic)
          </Label>
          <div className="flex items-center gap-1.5 text-[11px] text-[#5b7060] font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-[#5b7060]" />
            Required for Code Search API
          </div>
        </div>

        <div className="relative">
          <Input
            id="gh-token"
            type="password"
            placeholder={hasServerToken ? "GitHub token is remembered (leave blank to use it)" : "Enter ghp_... token"}
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            autoComplete="off"
            disabled={running}
            className="glass-input h-11 w-full rounded-2xl pl-3.5 pr-10 font-mono text-sm text-[#0f172a] border border-slate-200 bg-white"
          />
          <div
            className="absolute right-3.5 top-3.5 text-zinc-400"
            title={rememberToken || hasServerToken ? "Saved securely" : "Not saved"}
          >
            {rememberToken || hasServerToken ? (
              <Lock className="h-4 w-4 text-[#5b7060]" />
            ) : (
              <Unlock className="h-4 w-4 text-zinc-400" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberToken}
              onChange={(e) => handleRememberToggle(e.target.checked)}
              disabled={running}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-zinc-200 rounded-full peer peer-focus:ring-1 peer-focus:ring-[#5b7060]/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#5b7060] peer-checked:after:bg-white peer-checked:after:border-white"></div>
            <span className="ml-2 text-xs font-semibold text-slate-500">
              Remember token
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button
          onClick={() => onStart(token)}
          disabled={running}
          className="h-10 bg-[#5b7060] hover:bg-[#4a5b4e] text-white font-bold uppercase text-[10px] tracking-widest rounded-2xl px-4 shadow-md shadow-[#5b7060]/10 cursor-pointer flex items-center gap-1.5 transition-all duration-200"
        >
          <Play className="h-3.5 w-3.5" />
          Start Scan
        </Button>
        <Button
          variant="secondary"
          onClick={() => onRefresh(token)}
          disabled={running}
          className="glass-button h-10 border border-slate-200 rounded-2xl px-4 text-xs font-bold uppercase tracking-wider text-slate-650 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Refresh Scan
        </Button>
        <Button
          variant="outline"
          onClick={onLoadLast}
          disabled={running}
          className="glass-button h-10 border border-slate-200 rounded-2xl px-4 text-xs font-bold uppercase tracking-wider text-slate-655 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
        >
          <History className="h-3.5 w-3.5" />
          Load Last Scan
        </Button>
        <Button
          variant="outline"
          onClick={onDownload}
          disabled={!hasFindings}
          className="glass-button h-10 border border-slate-200 rounded-2xl px-4 text-xs font-bold uppercase tracking-wider text-slate-655 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Download className="h-3.5 w-3.5" />
          Download JSON
        </Button>
      </div>
    </div>
  );
}
