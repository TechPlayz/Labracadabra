"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  CalendarCheck,
  Sparkles,
  FolderKanban,
  CheckCircle2,
  BarChart3,
  FlaskConical,
  GraduationCap,
  ChevronRight,
  Scale,
  Settings,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampus } from "./CampusProvider";
import { DemoBadge } from "@/components/ui/DemoBadge";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  isAi?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Equipment Discovery", href: "/equipment", icon: Search },
  { label: "My Bookings", href: "/bookings", icon: CalendarCheck },
  {
    label: "AI Project Copilot",
    href: "/assistant",
    icon: Sparkles,
    isAi: true,
  },
  { label: "Project Workspace", href: "/projects", icon: FolderKanban },
  {
    label: "Faculty Approval",
    href: "/faculty",
    icon: CheckCircle2,

  },
  { label: "FairShare", href: "/conflicts", icon: Scale },
  { label: "Resource Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Lab check-in", href: "/check-in", icon: ScanLine },
  { label: "Lab administration", href: "/admin", icon: Settings },
];

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { workspace, submit } = useCampus();
  const actor = workspace?.actor;
  const [signOutError, setSignOutError] = React.useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col w-68 h-dvh sticky top-0 bg-[#090D18] border-r border-slate-800/80 shrink-0 select-none z-30",
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_15px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all">
            <div className="w-full h-full bg-[#080C15] rounded-[10px] flex items-center justify-center">
              <FlaskConical className="w-4.5 h-4.5 text-violet-400 group-hover:text-cyan-300 transition-colors" />
            </div>
            <Sparkles className="w-2.5 h-2.5 text-cyan-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-violet-200 bg-clip-text text-transparent">
              LABRACADABRA
            </span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium -mt-0.5">
              Campus Lab Exchange
            </span>
          </div>
        </Link>
      </div>

      {/* Campus Selector Banner */}
      <div className="px-4 py-3 border-b border-slate-800/50">
        <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <span className="text-[11px] font-medium text-slate-300 truncate max-w-[130px]">
              Campus exchange
            </span>
          </div>
          {workspace?.demo && <DemoBadge label="DEMO" />}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Platform
        </div>
        {NAV_ITEMS.filter((item) => { 
          if (item.href === "/faculty" || item.href === "/check-in") return actor?.role !== "student";
          if (item.href === "/analytics" || item.href === "/admin") return actor?.role === "lab_admin" || actor?.role === "super_admin";
          return true;
        }).map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-violet-950/60 text-white border border-violet-700/50 shadow-[0_0_20px_-5px_rgba(139,92,246,0.25)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60",
                item.isAi && !isActive && "hover:text-cyan-300"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 transition-colors shrink-0",
                  isActive
                    ? "text-violet-400"
                    : item.isAi
                    ? "text-cyan-400 group-hover:text-cyan-300"
                    : "text-slate-400 group-hover:text-slate-200"
                )}
              />
              <span className="truncate flex-1">{item.label}</span>
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Quick Card in Sidebar */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-gradient-to-br from-violet-950/50 via-slate-900/90 to-cyan-950/30 border border-violet-800/40">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span className="text-xs font-semibold text-slate-200">
            Lab Wish Copilot
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
          Find equipment for your project.
        </p>
        <Link
          href="/assistant" onClick={onNavigate}
          className="flex items-center justify-between text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
        >
          <span>Ask Copilot</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070A13]">
        <div className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-900/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
            {actor?.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-200 truncate">
              {actor?.name}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-violet-400" />
              {actor?.department || actor?.role.replaceAll("_", " ")}
            </span>
          </div>
        </div>
      </div>
      {workspace && !workspace.demo && <button type="button" className="mx-3 mb-3 rounded-lg border border-slate-800 p-2 text-sm" onClick={() => { void submit({ type: "signOut" }).catch(() => setSignOutError(true)); }}>Sign out</button>}
      {signOutError && <p role="alert" className="px-3 text-sm text-rose-300">Unable to sign out. Try again.</p>}
    </aside>
  );
}
