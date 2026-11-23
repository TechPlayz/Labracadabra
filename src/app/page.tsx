"use client";

import { ArrowRight, CalendarCheck, FlaskConical, Layers, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatSession, Status } from "@/components/ui/WorkspaceUI";
import { availability } from "@/lib/campus/discovery";

const ideas = ["Autonomous delivery robot", "IoT air-quality monitor", "Train a computer vision model"];

export default function DashboardPage() {
  return <AppLayout><Dashboard /></AppLayout>;
}

function Dashboard() {
  const { workspace } = useCampus();
  const router = useRouter();
  if (!workspace) return null;
  const upcoming = workspace.requests.filter((request) => request.ownerId === workspace.actor.id &&
    (request.status === "pending_approval" || request.status === "confirmed")).slice(0, 4);
  const available = availability(workspace, workspace.asOf);
  const categories = [...new Set(workspace.equipment.map((resource) => resource.category))];

  return (
    <div className="space-y-8 pb-10">
      <section className="hero-mesh relative overflow-hidden rounded-3xl border border-violet-500/25 bg-[#11182f] px-5 py-9 sm:px-10 sm:py-12">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative max-w-3xl">
          <p className="eyebrow flex items-center gap-2"><FlaskConical className="size-4" /> Campus Lab Exchange</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Your Lab Wishes, <span className="bg-linear-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">Granted.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">Tell us what you want to build. Discover the equipment, labs, and sessions that fit your project.</p>
          <form className="mt-7 flex flex-col gap-2 rounded-2xl border border-violet-500/30 bg-[#0a101e] p-2 sm:flex-row" onSubmit={(event) => {
            event.preventDefault();
            const prompt = String(new FormData(event.currentTarget).get("prompt") || "").trim();
            router.push(prompt ? `/assistant#${encodeURIComponent(prompt)}` : "/assistant");
          }}>
            <label className="relative min-w-0 flex-1">
              <Sparkles className="pointer-events-none absolute top-3 left-3 size-5 text-cyan-300" />
              <input name="prompt" aria-label="Describe your project" maxLength={1500}
                placeholder="I want to build an autonomous delivery robot…"
                className="field border-0 pl-10 text-sm sm:text-base" />
            </label>
            <Button type="submit" size="lg" className="shrink-0">Plan my project</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {ideas.map((idea) => <Link key={idea} href={`/assistant?prompt=${encodeURIComponent(idea)}`}
              className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-200 hover:border-violet-400">{idea}</Link>)}
          </div>
        </div>
      </section>

      <section aria-label="Campus overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric icon={<FlaskConical className="size-5" />} title="Equipment in catalog" count={workspace.equipment.length} />
        <Metric icon={<Layers className="size-5" />} title="Departments represented" count={new Set(workspace.equipment.map((resource) => resource.department)).size} />
        <Metric icon={<CalendarCheck className="size-5" />} title="Equipment with openings in 14 days" count={available.size} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Explore equipment</h2><Button href="/equipment" variant="outline" size="sm">View catalog</Button></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => <Link key={category} href={`/equipment?category=${encodeURIComponent(category)}`} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/25 p-3 text-sm text-slate-200 hover:border-violet-500/60"><Search className="size-4 text-violet-300" />{category}</Link>)}
            {!categories.length && <p className="text-sm text-slate-400">No equipment has been published yet.</p>}
          </div>
        </Card>
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Your upcoming requests</h2><Button href="/bookings" variant="outline" size="sm">My bookings</Button></div>
          {upcoming.length ? upcoming.map((request) => (
            <Link key={request.id} href="/bookings" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3 hover:border-violet-500/60">
              <span><span className="block text-sm font-semibold">{workspace.equipment.find((item) => item.id === request.equipmentId)?.name}</span>
              <span className="block text-sm text-slate-400">{formatSession(request.start, request.end)}</span></span><Status status={request.status} />
            </Link>
          )) : <p className="text-sm text-slate-400">Your time slots and faculty reviews will appear here.</p>}
        </Card>
      </div>
      <Link href="/conflicts" className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm hover:border-violet-500/60">
        <Badge variant="violet">FairShare</Badge><span className="flex-1 text-slate-300">Review scheduling conflicts and compatible alternatives.</span><ArrowRight className="size-4 text-violet-300" />
      </Link>
    </div>
  );
}

function Metric({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return <Card className="flex items-center gap-4 p-5"><span className="rounded-xl bg-violet-950 p-3 text-violet-300">{icon}</span>
    <div><p className="text-2xl font-bold tabular-nums">{count}</p><p className="text-sm text-slate-300">{title}</p></div></Card>;
}
