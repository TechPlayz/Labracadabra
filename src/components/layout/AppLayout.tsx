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

  return <div className="mx-auto flex min-h-dvh max-w-[1680px] gap-5 px-3 pt-2.5 sm:px-5 lg:px-5 lg:pt-4">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-paper focus:p-3">Skip to content</a>
    {workspace && <Sidebar className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[218px] shrink-0 lg:flex xl:w-[230px]" />}
    {workspace && <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />}
    <div className="flex min-w-0 flex-1 flex-col">
      <TopNavigation onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1260px] min-w-0 flex-1 px-1 pt-7 pb-12 sm:px-2 lg:px-4 lg:pt-9">
        {workspace ? children : loading ? (
          <div role="status" aria-label="Loading campus workspace" className="space-y-4 motion-safe:animate-pulse">
            <div className="h-10 w-48 rounded-lg bg-line" />
            <div className="h-28 rounded-2xl bg-soft" />
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]"><div className="h-64 rounded-2xl bg-soft" /><div className="h-48 rounded-2xl bg-soft" /></div>
          </div>
        ) : (
          <Card className="mx-auto mt-8 max-w-lg space-y-4 p-6">
            <h1 className="text-2xl font-semibold">Campus workspace</h1>
            <p role="status" className="text-quiet">{error}</p>
            <div className="flex flex-wrap gap-2"><Button href="/login">Campus sign-in</Button><Button variant="outline" onClick={() => void refresh()}>Try again</Button></div>
          </Card>
        )}
      </main>
    </div>
  </div>;
}
