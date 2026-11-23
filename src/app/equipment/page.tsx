"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cpu, FlaskConical, MapPin, Search, Sparkles } from "lucide-react";
import { Suspense, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDay, formatClock, PageHeading } from "@/components/ui/WorkspaceUI";
import { catalogSearch } from "@/lib/campus/discovery";

export default function EquipmentPage() {
  return <AppLayout><Suspense fallback={<p role="status">Loading equipment…</p>}><Catalog /></Suspense></AppLayout>;
}

function Catalog() {
  const search = useSearchParams();
  return <Filters key={search.toString()} query={search.get("q") ?? ""} category={search.get("category") ?? ""} />;
}

function Filters({ query, category }: { query: string; category: string }) {
  const { workspace } = useCampus();
  const [filters, setFilters] = useState({ query, category, availability: "", access: "", sort: "relevance" });
  if (!workspace) return null;
  const categories = [...new Set(workspace.equipment.map((resource) => resource.category))].sort();
  const results = catalogSearch(workspace, filters, workspace.asOf);

  return (
    <div className="space-y-6">
      <PageHeading title="Equipment discovery" description="Find lab workstations, development kits, and tools across campus."
        action={<Button href="/assistant" variant="outline" leftIcon={<Sparkles className="size-4" />}>Plan with Copilot</Button>} />
      <Card className="grid gap-3 p-4 min-[380px]:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium min-[380px]:col-span-2 xl:col-span-4">Search equipment
          <span className="relative mt-1 block"><Search className="pointer-events-none absolute top-3 size-4 left-3 text-slate-400" />
            <input type="search" className="field pl-9" placeholder="Try Raspberry Pi, GPIO, or Mechatronics"
              value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
          </span>
        </label>
        <label className="text-sm font-medium">Category<select className="field mt-1" value={filters.category}
          onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          <option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}
        </select></label>
        <label className="text-sm font-medium">Availability<select className="field mt-1" value={filters.availability}
          onChange={(event) => setFilters({ ...filters, availability: event.target.value })}>
          <option value="">Any availability</option><option value="today">Openings today</option><option value="upcoming">Openings within 14 days</option>
        </select></label>
        <label className="text-sm font-medium">Access<select className="field mt-1" value={filters.access}
          onChange={(event) => setFilters({ ...filters, access: event.target.value })}>
          <option value="">All access types</option><option value="open">Open access</option><option value="approval">Faculty approval</option><option value="training">Training required</option>
        </select></label>
        <label className="text-sm font-medium">Sort by<select className="field mt-1" value={filters.sort}
          onChange={(event) => setFilters({ ...filters, sort: event.target.value })}>
          <option value="relevance">Relevance</option><option value="availability">Next opening</option>
        </select></label>
      </Card>
      <p role="status" className="text-sm text-slate-300">{results.length} {results.length === 1 ? "resource" : "resources"}</p>
      {results.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map(({ resource, next }) => (
            <Card key={resource.id} hoverGlow className="flex min-w-0 flex-col overflow-hidden">
              <div className="grid-pattern flex min-h-24 items-center justify-between gap-3 border-b border-slate-800 bg-violet-950/25 px-4 py-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-violet-500/25 bg-[#141832] text-violet-200">
                  {resource.capabilities.includes("gpu") || resource.capabilities.includes("gpio") ? <Cpu className="size-6" /> : <FlaskConical className="size-6" />}
                </span>
                <Badge variant={next ? "success" : "default"}>{next ? "Openings available" : "No openings in 14 days"}</Badge>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <p className="text-xs font-medium text-cyan-300">{resource.category}</p>
                <h2 className="text-lg font-semibold leading-tight"><Link className="hover:text-violet-200" href={`/equipment/${resource.id}`}>{resource.name}</Link></h2>
                <p className="flex gap-2 text-sm text-slate-300"><MapPin className="mt-0.5 size-4 shrink-0 text-violet-300" />{resource.department} · {resource.lab}</p>
                <p className="text-sm text-slate-300">{resource.specifications}</p>
                <div className="flex flex-wrap gap-1.5">
                  {resource.requiresApproval && <Badge variant="violet">Faculty approval</Badge>}
                  {resource.requiresTraining && <Badge variant="warning">Training required</Badge>}
                </div>
                {next && <p className="text-sm text-slate-300">Next opening {formatDay(next)} · {formatClock(next)} IST</p>}
                <Button href={`/equipment/${resource.id}`} variant="outline" className="mt-auto self-start">Details and booking</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : <Card className="space-y-3 p-6"><p>No resources match those filters.</p><Button variant="outline" onClick={() => setFilters({ query: "", category: "", availability: "", access: "", sort: "relevance" })}>Clear filters</Button></Card>}
    </div>
  );
}
