"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, MapPin, Search, Sparkles } from "lucide-react";
import { Suspense, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EquipmentMedia } from "@/components/ui/EquipmentMedia";
import { formatDay, formatClock, PageHeading } from "@/components/ui/WorkspaceUI";
import { catalogSearch } from "@/lib/campus/discovery";

const initialFilters = { query: "", category: "", department: "", availability: "", access: "", sort: "relevance" };

export default function EquipmentPage() {
  return <AppLayout><Suspense fallback={<p role="status">Loading equipment…</p>}><Catalog /></Suspense></AppLayout>;
}

function Catalog() {
  const search = useSearchParams();
  return <Filters key={search.toString()} query={search.get("q") ?? ""} category={search.get("category") ?? ""} />;
}

function Filters({ query, category }: { query: string; category: string }) {
  const { workspace } = useCampus();
  const [filters, setFilters] = useState({ ...initialFilters, query, category });
  const [view, setView] = useState<"grid" | "list">("grid");
  if (!workspace) return null;
  const categories = [...new Set(workspace.equipment.map((resource) => resource.category))].sort();
  const departments = [...new Set(workspace.equipment.map((resource) => resource.department))].sort();
  const results = catalogSearch(workspace, filters, workspace.asOf).filter(({ resource }) =>
    !filters.department || resource.department === filters.department);
  const list = view === "list";

  return <div className="space-y-5">
    <PageHeading title="Equipment discovery" description="Browse and reserve equipment across campus."
      action={<Button href="/assistant" variant="outline" leftIcon={<Sparkles className="size-4" />}>Plan with Copilot</Button>} />
    <Card className="space-y-3 p-3.5 sm:p-4">
      <label className="sr-only" htmlFor="catalog-search">Search equipment</label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-quiet" />
        <input id="catalog-search" type="search" className="field pl-9" placeholder="Search name, capability, or lab"
          value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <Filter label="Category" value={filters.category} onChange={(category) => setFilters({ ...filters, category })}>
          <option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}
        </Filter>
        <Filter label="Department" value={filters.department} onChange={(department) => setFilters({ ...filters, department })}>
          <option value="">Any department</option>{departments.map((item) => <option key={item}>{item}</option>)}
        </Filter>
        <Filter label="Availability" value={filters.availability} onChange={(availability) => setFilters({ ...filters, availability })}>
          <option value="">Any availability</option><option value="today">Openings today</option><option value="upcoming">Openings in 14 days</option>
        </Filter>
        <Filter label="Access" value={filters.access} onChange={(access) => setFilters({ ...filters, access })}>
          <option value="">Any access</option><option value="open">Open access</option><option value="approval">Faculty approval</option><option value="training">Training required</option>
        </Filter>
        <Filter label="Sort by" value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })}>
          <option value="relevance">Relevance</option><option value="availability">Next opening</option>
        </Filter>
      </div>
    </Card>

    <div className="flex items-center justify-between gap-2">
      <p role="status" className="text-sm font-medium text-quiet">{results.length} {results.length === 1 ? "resource" : "resources"}</p>
      <div role="group" aria-label="Equipment view" className="flex gap-1 rounded-[10px] border border-line bg-paper p-1">
        <Button variant={list ? "ghost" : "secondary"} size="sm" aria-label="Grid view" aria-pressed={!list} onClick={() => setView("grid")}><LayoutGrid className="size-4" /></Button>
        <Button variant={list ? "secondary" : "ghost"} size="sm" aria-label="List view" aria-pressed={list} onClick={() => setView("list")}><List className="size-4" /></Button>
      </div>
    </div>

    {results.length ? <div className={list ? "panel divide-y divide-line" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
      {results.map(({ resource, next }, index) => {
        const href = `/equipment/${resource.id}`;
        return <article key={resource.id} className={list ? "grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-start gap-3 p-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4" : "panel flex min-w-0 flex-col overflow-hidden"}>
          <Link href={href} aria-label={`View ${resource.name}`} className={list ? "block overflow-hidden rounded-lg" : "block border-b border-line"}>
            <EquipmentMedia resource={resource} className={list ? "aspect-square sm:aspect-[3/2]" : "aspect-[2/1]"} sizes={list ? "96px" : "(max-width: 640px) 100vw, 365px"} thumbnail eager={index < 3} />
          </Link>
          <div className={list ? "min-w-0 space-y-1.5" : "flex min-w-0 flex-1 flex-col gap-2.5 p-4"}>
            <p className="text-xs font-semibold text-quiet">{resource.category}</p>
            <h2 className="section-title"><Link className="hover:text-accent-ink" href={href}>{resource.name}</Link></h2>
            <p className="flex items-start gap-1.5 text-sm text-quiet"><MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{resource.department} · {resource.lab}</p>
            <p className="text-sm text-quiet">{resource.specifications}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {resource.requiresApproval && <Badge size="sm" variant="outline">Faculty approval</Badge>}
              {resource.requiresTraining && <Badge size="sm" variant="warning">Training required</Badge>}
            </div>
            {!list && <div className="mt-auto space-y-2.5 border-t border-line pt-3">
              <Availability next={next} />
              <Button href={href} variant="outline" size="sm">Details and booking</Button>
            </div>}
          </div>
          {list && <div className="col-start-2 space-y-2 sm:col-start-auto sm:w-[160px]">
            <Availability next={next} />
            <Button href={href} variant="outline" size="sm">Details and booking</Button>
          </div>}
        </article>;
      })}
    </div> : <Card className="space-y-3 p-6"><p className="font-semibold">No resources match those filters.</p><Button variant="outline" onClick={() => setFilters(initialFilters)}>Clear filters</Button></Card>}
  </div>;
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="min-w-0 text-xs font-semibold text-quiet">{label}
    <select className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
  </label>;
}

function Availability({ next }: { next?: string }) {
  return <p className={`flex items-start gap-2 text-xs font-medium tabular-nums ${next ? "text-success-ink" : "text-quiet"}`}>
    <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
    {next ? `Next opening ${formatDay(next)} · ${formatClock(next)} IST` : "No openings in 14 days"}
  </p>;
}
