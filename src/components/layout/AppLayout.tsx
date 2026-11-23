"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNavigation } from "./TopNavigation";
import { MobileNav } from "./MobileNav";
import { useCampus } from "./CampusProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { workspace, loading, error, refresh } = useCampus();

  return (
    <div className="flex min-h-dvh bg-[#080C15] text-slate-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-violet-700 focus:p-3">Skip to content</a>
      {workspace && <Sidebar className="hidden lg:flex" />}
      {workspace && <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavigation onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
          {workspace ? children : loading ? (
            <div role="status" aria-label="Loading campus workspace" className="grid gap-4 motion-safe:animate-pulse">
              <div className="h-44 rounded-2xl bg-slate-900" />
              <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((key) => <div key={key} className="h-32 rounded-2xl bg-slate-900" />)}</div>
            </div>
          ) : (
            <Card className="mx-auto mt-8 max-w-lg space-y-4 p-6">
              <h1 className="text-2xl font-semibold">Campus workspace</h1>
              <p role="status" className="text-slate-300">{error}</p>
              <div className="flex flex-wrap gap-2">
                <Button href="/login">Campus sign-in</Button>
                <Button variant="outline" onClick={() => void refresh()}>Try again</Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
