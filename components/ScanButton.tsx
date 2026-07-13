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
  const [serverLoading, setServerLoading] = useState(false);

  // Check if a server-wide token is configured in the project SQLite database
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

  // Load saved local preference and check server-side token on component mount
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
    }
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberToken(checked);
    localStorage.setItem(REMEMBER_KEY, String(checked));
    if (checked) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSaveToServer = async () => {
    if (!token) return;
    setServerLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "github_token", value: token }),
      });
      if (res.ok) {
        setHasServerToken(true);
        setToken(""); // Clear the input field so it's not sitting exposed
      }
    } catch (err) {
      console.error("Failed to save token to server", err);
    } finally {
      setServerLoading(false);
    }
  };

  const handleClearServerToken = async () => {
    setServerLoading(true);
    try {
      const res = await fetch("/api/settings?key=github_token", {
        method: "DELETE",
      });
      if (res.ok) {
        setHasServerToken(false);
      }
    } catch (err) {
      console.error("Failed to clear server token", err);
    } finally {
      setServerLoading(false);
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
            <Key className="h-3.5 w-3.5 text-[#7c3aed]" />
            GitHub Personal Access Token (Classic)
          </Label>
          <div className="flex items-center gap-1.5 text-[11px] text-[#7c3aed] font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-[#7c3aed]" />
            Required for Code Search API
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="gh-token"
              type="password"
              placeholder={hasServerToken ? "GitHub token is saved on server (leave blank to use it)" : "Enter ghp_... token"}
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              autoComplete="off"
              disabled={running}
              className="glass-input h-11 w-full rounded-lg pl-3.5 pr-10 font-mono text-sm text-[#0f172a] border border-slate-200 bg-white"
            />
            <div
              className="absolute right-3.5 top-3.5 text-zinc-400"
              title={rememberToken || hasServerToken ? "Saved securely" : "Not saved"}
            >
              {rememberToken || hasServerToken ? (
                <Lock className="h-4 w-4 text-[#7c3aed]" />
              ) : (
                <Unlock className="h-4 w-4 text-zinc-400" />
              )}
            </div>
          </div>

          {token && (
            <Button
              onClick={handleSaveToServer}
              disabled={running || serverLoading}
              className="h-11 bg-white hover:bg-slate-50 text-[#7c3aed] border border-slate-200 font-bold uppercase text-[10px] tracking-wider rounded-lg px-3.5 transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Save to Server
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberToken}
              onChange={(e) => handleRememberToggle(e.target.checked)}
              disabled={running}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-zinc-200 rounded-full peer peer-focus:ring-1 peer-focus:ring-[#7c3aed]/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#7c3aed] peer-checked:after:bg-white peer-checked:after:border-white"></div>
            <span className="ml-2 text-xs font-semibold text-slate-500">
              Remember token in this browser (saved locally)
            </span>
          </label>
          
          {hasServerToken && (
            <button
              onClick={handleClearServerToken}
              disabled={running || serverLoading}
              className="text-[10px] uppercase font-bold tracking-widest text-red-500 hover:text-red-750 transition-colors cursor-pointer"
            >
              Clear Server Token
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button
          onClick={() => onStart(token)}
          disabled={running}
          className="h-10 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold uppercase text-[10px] tracking-widest rounded-lg px-4 shadow-md shadow-[#7c3aed]/10 cursor-pointer flex items-center gap-1.5 transition-all duration-200"
        >
          <Play className="h-3.5 w-3.5" />
          Start Scan
        </Button>
        <Button
          variant="secondary"
          onClick={() => onRefresh(token)}
          disabled={running}
          className="glass-button h-10 border border-slate-200 rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-slate-650 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Refresh Scan
        </Button>
        <Button
          variant="outline"
          onClick={onLoadLast}
          disabled={running}
          className="glass-button h-10 border border-slate-200 rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-slate-655 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
        >
          <History className="h-3.5 w-3.5" />
          Load Last Scan
        </Button>
        <Button
          variant="outline"
          onClick={onDownload}
          disabled={!hasFindings}
          className="glass-button h-10 border border-slate-200 rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-slate-655 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Download className="h-3.5 w-3.5" />
          Download JSON
        </Button>
      </div>
    </div>
  );
}
