"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, Sparkles } from "lucide-react";
import { useState } from "react";
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

  return <header className="glass-panel sticky top-2 z-20 rounded-[16px] lg:top-4">
    <div className="flex min-h-[58px] flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-2 sm:gap-x-3 sm:px-3.5">
      {workspace && <button type="button" onClick={onOpenMobileMenu} aria-label="Open navigation menu" aria-haspopup="dialog"
        className="icon-control lg:hidden"><Menu className="size-5" /></button>}
      <form role="search" className="relative min-w-0 flex-1 sm:max-w-[340px]" onSubmit={(event) => {
        event.preventDefault();
        const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        router.push(query ? `/equipment?q=${encodeURIComponent(query)}` : "/equipment");
      }}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-quiet" />
        <input name="q" type="search" aria-label="Search campus equipment" placeholder="Search equipment"
          className="field rounded-[9px] border-line bg-paper/85 pl-9" />
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <Link href="/assistant" className="hidden min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-accent-ink hover:bg-accent-soft xl:flex"><Sparkles className="size-4" /> Ask Copilot</Link>
        {workspace && <button type="button" aria-haspopup="dialog" aria-label={`Notifications, ${unread} unread`}
          onClick={() => { setError(""); setShowNotices(true); }} className="icon-control relative">
          <Bell className="size-[19px]" />
          {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full border border-paper bg-accent" />}
        </button>}
      </div>
      {workspace?.demo && <div className="flex w-full items-center gap-2 border-t border-line pt-1.5 text-xs text-quiet sm:w-auto sm:border-t-0 sm:pt-0">
        <label htmlFor="demo-persona" className="shrink-0 font-semibold">Demo persona</label>
        <select id="demo-persona" value={workspace.actor.id} disabled={busy} className="field min-h-8 max-w-[220px] border-line py-1 text-xs sm:max-w-[150px] xl:max-w-[195px]" onChange={async (event) => {
          const id = event.target.value;
          setError(""); setBusy(true);
          try { await submit({ type: "persona", id }); }
          catch (error) { setError(error instanceof Error ? error.message : "Unable to switch persona."); }
          finally { setBusy(false); }
        }}>
          {personas.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role.replaceAll("_", " ")}</option>)}
        </select>
      </div>}
    </div>
    {error && !showNotices && <p role="alert" className="px-4 pb-2 text-sm text-error-ink">{error}</p>}
    <Modal title="Notifications" isOpen={showNotices} onClose={() => setShowNotices(false)}>
      <div className="space-y-3">
        {workspace?.notices.length ? <ul className="divide-y divide-line">
          {workspace.notices.map((notice) => <li key={notice.id} className={`py-2 text-sm ${notice.read ? "text-quiet" : "font-medium text-ink"}`}>{notice.message}</li>)}
        </ul> : <p className="text-sm text-quiet">You’re up to date.</p>}
        {unread > 0 && <Button variant="outline" onClick={() => {
          setError("");
          void submit({ type: "readNotices" }).catch(() => setError("Unable to update notifications."));
        }}>Mark all read</Button>}
        {error && <p role="alert" className="text-sm text-error-ink">{error}</p>}
      </div>
    </Modal>
  </header>;
}
