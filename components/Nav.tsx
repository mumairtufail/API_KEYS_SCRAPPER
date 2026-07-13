"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoIcon } from "./LogoIcon";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about-keys", label: "About Keys" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Left Logo and Brand */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoIcon className="h-7 w-7 text-[#5b7060]" />
            <span className="font-extrabold tracking-wider text-xs uppercase font-sans text-slate-800">
              AK_SCANNER
            </span>
          </Link>
          
          {/* Middle Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-widest font-bold">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative py-5 text-zinc-500 transition-colors hover:text-slate-800",
                    active && "text-[#5b7060] font-extrabold"
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#5b7060] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right User & Logout actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Admin
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-[10px] uppercase tracking-wider font-bold text-slate-600 hover:text-red-600 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
