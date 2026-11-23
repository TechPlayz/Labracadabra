"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarCheck, ClipboardCheck, FlaskConical, FolderOpen, LayoutDashboard, LogOut, ScanLine, Scale, Search, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampus } from "./CampusProvider";

const groups = [
  { label: "Workspace", items: [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Equipment", href: "/equipment", icon: Search },
    { label: "Projects", href: "/projects", icon: FolderOpen },
    { label: "My bookings", href: "/bookings", icon: CalendarCheck },
  ] },
  { label: "Lab operations", items: [
    { label: "AI Lab Copilot", href: "/assistant", icon: Sparkles },
    { label: "FairShare", href: "/conflicts", icon: Scale },
    { label: "Faculty approvals", href: "/faculty", icon: ClipboardCheck, access: "staff" },
    { label: "Lab check-in", href: "/check-in", icon: ScanLine, access: "staff" },
    { label: "Analytics", href: "/analytics", icon: BarChart3, access: "admin" },
    { label: "Administration", href: "/admin", icon: Settings2, access: "admin" },
  ] },
];

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { workspace, submit } = useCampus();
  const [signOutError, setSignOutError] = useState(false);
  const actor = workspace?.actor;
  const admin = actor?.role === "super_admin" || actor?.role === "lab_admin";

  return <aside className={cn("glass-panel flex min-h-0 flex-col rounded-[19px] px-3 py-4", className)}>
    <Link href="/" onClick={onNavigate} className="mb-6 flex items-center gap-2.5 rounded-lg px-2 py-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-accent/15 bg-accent-soft text-accent-ink shadow-xs"><FlaskConical aria-hidden="true" className="size-5" /></span>
      <span><span className="block text-[15px] font-bold tracking-tight">Labracadabra</span><span className="block text-xs text-quiet">Campus lab workspace</span></span>
    </Link>
    <nav aria-label="Workspace" className="min-h-0 flex-1 space-y-6 overflow-y-auto p-0.5">
      {groups.map((group) => <div key={group.label} className="space-y-1">
        <p className="eyebrow px-2.5 pb-1">{group.label}</p>
        {group.items.filter((item) => item.access === "admin" ? admin : item.access !== "staff" || actor?.role !== "student").map(({ label, href, icon: Icon }) => {
          const current = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
          return <Link key={href} href={href} onClick={onNavigate} aria-current={current ? "page" : undefined}
            className={cn("flex min-h-10 items-center gap-2.5 rounded-[9px] border px-2.5 py-1.5 text-sm font-medium transition-colors", current ? "border-accent/18 bg-accent-soft text-accent-ink" : "border-transparent text-quiet hover:bg-paper hover:text-ink")}>
            <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.7} />{label}
          </Link>;
        })}
      </div>)}
    </nav>
    {actor && <div className="mt-4 border-t border-line px-1 pt-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-soft text-xs font-semibold text-accent-ink">{actor.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{actor.name}</span><span className="block truncate text-xs text-quiet">{actor.department || actor.role.replaceAll("_", " ")}</span></span>
        {!workspace.demo && <button type="button" className="icon-control" aria-label="Sign out" onClick={() => { void submit({ type: "signOut" }).catch(() => setSignOutError(true)); }}><LogOut className="size-4" /></button>}
      </div>
      {signOutError && <p role="alert" className="mt-2 text-xs text-error-ink">Unable to sign out. Try again.</p>}
    </div>}
  </aside>;
}
