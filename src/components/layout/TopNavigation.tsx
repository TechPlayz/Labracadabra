"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCampus } from "./CampusProvider";

export function TopNavigation({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const router = useRouter();
  const { workspace, personas, submit } = useCampus();
  const [showNotices, setShowNotices] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unread = workspace?.notices.filter((notice) => !notice.read).length ?? 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#080C16]/95 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {workspace && (
          <button type="button" onClick={onOpenMobileMenu} aria-label="Open navigation menu" aria-haspopup="dialog"
            className="shrink-0 rounded-lg p-2 text-slate-300 hover:bg-slate-800 lg:hidden"><Menu className="size-5" /></button>
        )}
        <form role="search" className="relative min-w-0 flex-1 max-w-xl" onSubmit={(event) => {
          event.preventDefault();
          const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
          router.push(query ? `/equipment?q=${encodeURIComponent(query)}` : "/equipment");
        }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" type="search" aria-label="Search campus equipment" placeholder="Search equipment"
            className="w-full rounded-xl border border-slate-700 bg-[#0D1424] py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-400" />
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/assistant" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-violet-200 hover:bg-violet-950 sm:flex">
            <Sparkles className="size-4 text-cyan-300" /> Ask Copilot
          </Link>
          {workspace?.demo && <DemoBadge label="DEMO" />}
          {workspace && (
            <button type="button" aria-haspopup="dialog" aria-label={`Notifications, ${unread} unread`}
              onClick={() => setShowNotices(true)} className="relative rounded-lg p-2 text-slate-300 hover:bg-slate-800">
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-cyan-400" />}
            </button>
          )}
        </div>
      </div>
      {workspace?.demo && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 px-4 py-2 text-sm text-slate-300 sm:px-6">
          <label htmlFor="demo-persona">Demo persona</label>
          <select id="demo-persona" value={workspace.actor.id} disabled={busy} className="max-w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
            onChange={async (event) => {
              const id = event.target.value;
              setError("");
              setBusy(true);
              try { await submit({ type: "persona", id }); }
              catch (error) { setError(error instanceof Error ? error.message : "Unable to switch persona."); }
              finally { setBusy(false); }
            }}>
            {personas.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role.replaceAll("_", " ")}</option>)}
          </select>
          {error && <span role="alert" className="text-rose-300">{error}</span>}
        </div>
      )}
      <Modal title="Notifications" isOpen={showNotices} onClose={() => setShowNotices(false)}>
        <div className="space-y-3">
          {workspace?.notices.length ? workspace.notices.map((notice) => (
            <p key={notice.id} className={`rounded-lg border border-slate-800 p-3 text-sm ${notice.read ? "text-slate-400" : "text-cyan-100"}`}>{notice.message}</p>
          )) : <p className="text-sm text-slate-400">You’re up to date.</p>}
          {unread > 0 && <Button variant="outline" onClick={() => {
            setError("");
            void submit({ type: "readNotices" }).catch(() => setError("Unable to update notifications."));
          }}>Mark all read</Button>}
          {error && <p role="alert" className="text-rose-300">{error}</p>}
        </div>
      </Modal>
    </header>
  );
}
