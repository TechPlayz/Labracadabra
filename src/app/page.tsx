"use client";

import { Building2, CalendarCheck, Clock3, Cpu, FlaskConical, Layers3, Scale, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EquipmentMedia } from "@/components/ui/EquipmentMedia";
import { formatClock, formatDay, Status } from "@/components/ui/WorkspaceUI";
import { availability } from "@/lib/campus/discovery";

const ideas = ["Autonomous delivery robot", "IoT air-quality monitor", "Train a computer vision model"];

export default function DashboardPage() {
  return <AppLayout><Dashboard /></AppLayout>;
}

function Dashboard() {
  const { workspace } = useCampus();
  const router = useRouter();
  if (!workspace) return null;
  const own = workspace.requests.filter((item) => item.ownerId === workspace.actor.id);
  const scheduled = own.filter((item) => item.status === "confirmed" && Date.parse(item.end) > workspace.asOf)
    .sort((first, second) => Date.parse(first.start) - Date.parse(second.start));
  const pending = (workspace.actor.role === "student" ? own : workspace.requests)
    .filter((item) => item.status === "pending_approval");
  const available = availability(workspace, workspace.asOf);
  const categories = [...new Set(workspace.equipment.map((resource) => resource.category))];
  const recent = [...new Set(own.filter((request) => request.status === "completed")
    .sort((first, second) => Date.parse(second.end) - Date.parse(first.end)).map((request) => request.equipmentId))]
    .flatMap((id) => workspace.equipment.filter((item) => item.id === id)).slice(0, 4);
  const featured = ["NVIDIA GPU Workstation", "Raspberry Pi Development Kit", "FDM 3D Printer", "Digital Oscilloscope"]
    .flatMap((name) => workspace.equipment.find((item) => item.name === name) ?? []);
  const shelf = featured.length ? featured : workspace.equipment.slice(0, 4);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Campus overview <span aria-hidden="true">·</span> {formatDay(new Date(workspace.asOf).toISOString())}</p>
        <h1 className="mt-1 text-[34px] leading-tight font-semibold tracking-[-0.042em] sm:text-[42px]">Welcome, {workspace.actor.name.split(" ")[0]}</h1>
        <p className="mt-1.5 text-sm text-quiet">Your Lab Wishes, Granted.</p>
      </div>
      <Button href="/equipment" leftIcon={<FlaskConical className="size-4" />}>Browse equipment</Button>
    </header>

    <section aria-label="Resource availability" className="panel overview-strip">
      <Metric icon={<Cpu />} title="Equipment resources" count={workspace.equipment.length} detail="In the campus catalog" />
      <Metric icon={<Building2 />} title="Departments" count={new Set(workspace.equipment.map((item) => item.department)).size} detail="Sharing lab resources" />
      <Metric icon={<CalendarCheck />} title="Resources with openings" count={available.size} detail="In the next 14 days" />
      <Metric icon={<Clock3 />} title={workspace.actor.role === "student" ? "Pending requests" : "Pending approvals"} count={pending.length} detail="Awaiting faculty review" />
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(270px,1fr)]">
      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <h2 className="section-title">Upcoming bookings</h2>
            <Button href="/bookings" variant="ghost" size="sm">View bookings</Button>
          </div>
          {scheduled.length ? <ul className="divide-y divide-line">
            {scheduled.slice(0, 4).map((request) => <li key={request.id}>
              <Link href="/bookings" className="schedule-row px-4 py-3 text-sm hover:bg-soft/55 sm:px-5">
                <span className="font-semibold">{workspace.equipment.find((item) => item.id === request.equipmentId)?.name ?? "Lab session"}</span>
                <span className="text-xs text-quiet tabular-nums">{formatDay(request.start)} · {formatClock(request.start)} IST</span>
                <Status status={request.status} />
              </Link>
            </li>)}
          </ul> : <div className="flex items-center gap-3 px-4 py-6 sm:px-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-soft text-accent-ink"><CalendarCheck className="size-5" /></span>
            <div><p className="text-sm font-semibold">No confirmed sessions</p><p className="text-sm text-quiet">Reserved lab time will appear here.</p></div>
          </div>}
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <h2 className="section-title">{workspace.actor.role === "student" ? "Pending requests" : "Approval queue"}</h2>
            <Button href={workspace.actor.role === "student" ? "/bookings" : "/faculty"} variant="ghost" size="sm">View queue</Button>
          </div>
          {pending.length ? <ul className="divide-y divide-line">
            {pending.slice(0, 3).map((request) => <li key={request.id} className="schedule-row px-4 py-3 text-sm sm:px-5">
              <span className="font-semibold">{workspace.equipment.find((item) => item.id === request.equipmentId)?.name ?? "Lab request"}</span>
              <span className="text-xs text-quiet tabular-nums">{formatDay(request.start)} · {formatClock(request.start)} IST</span>
              <Status status={request.status} />
            </li>)}
          </ul> : <p className="px-4 py-4 text-sm text-quiet sm:px-5">There are no requests awaiting review in your workspace.</p>}
        </Card>
      </div>

      <div className="space-y-4">
        <section className="glass-panel space-y-3 rounded-[17px] p-4 sm:p-5">
          <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-[9px] bg-accent-soft text-accent-ink"><Sparkles className="size-4" /></span><h2 className="section-title">AI Lab Copilot</h2></div>
          <p className="text-sm leading-relaxed text-quiet">Describe a project to find suitable lab resources.</p>
          <form className="space-y-2" onSubmit={(event) => {
            event.preventDefault();
            const prompt = String(new FormData(event.currentTarget).get("prompt") || "").trim();
            router.push(prompt ? `/assistant#${encodeURIComponent(prompt)}` : "/assistant");
          }}>
            <input name="prompt" aria-label="Describe your project" maxLength={1500} className="field" placeholder="What are you building?" />
            <Button type="submit" variant="secondary" className="w-full">Plan my project</Button>
          </form>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-3">
            {ideas.map((idea) => <Link key={idea} href={`/assistant?prompt=${encodeURIComponent(idea)}`} className="text-xs font-medium text-accent-ink hover:underline">{idea}</Link>)}
          </div>
        </section>
        <Link href="/conflicts" className="panel flex items-center gap-3 p-3.5 transition-colors hover:border-accent/50">
          <Scale className="size-5 shrink-0 text-accent-ink" /><span><span className="block text-sm font-semibold">FairShare</span><span className="block text-xs text-quiet">Review conflicts and suggested allocations</span></span>
        </Link>
      </div>
    </div>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="section-title">Explore equipment</h2><Button href="/equipment" variant="ghost" size="sm">Open inventory</Button></div>
      {shelf.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {shelf.map((resource) => <Link key={resource.id} href={`/equipment/${resource.id}`} className="panel min-w-0 overflow-hidden transition-colors hover:border-accent/50">
          <EquipmentMedia resource={resource} className="aspect-[2/1]" sizes="(max-width: 1023px) 45vw, 270px" thumbnail eager />
          <div className="p-3"><p className="text-sm font-semibold leading-snug">{resource.name}</p><p className="mt-1 text-xs text-quiet">{resource.department}</p></div>
        </Link>)}
      </div> : <p className="text-sm text-quiet">No equipment has been published yet.</p>}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => <Link key={category} href={`/equipment?category=${encodeURIComponent(category)}`} className="rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-accent-ink hover:border-accent/50">{category}</Link>)}
      </div>
    </section>

    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card className="p-4 sm:p-5"><h2 className="section-title mb-3 flex items-center gap-2"><Layers3 className="size-4 text-accent-ink" /> Recently used equipment</h2>
        {recent.length ? <ul className="divide-y divide-line">{recent.map((item) => <li key={item.id}><Link className="flex items-center gap-3 py-2 text-sm hover:text-accent-ink" href={`/equipment/${item.id}`}><EquipmentMedia resource={item} className="size-8 rounded-[7px]" sizes="32px" thumbnail />{item.name}</Link></li>)}</ul>
          : <p className="text-sm text-quiet">Completed lab sessions will appear here.</p>}
      </Card>
      <Card className="p-4 sm:p-5"><h2 className="section-title mb-3">Campus activity</h2>
        {workspace.notices.length ? <ul className="divide-y divide-line">{workspace.notices.slice(0, 4).map((notice) => <li key={notice.id} className="py-2 text-sm text-quiet">{notice.message}</li>)}</ul>
          : <p className="text-sm text-quiet">Booking updates and approval decisions will appear here.</p>}
      </Card>
    </div>
  </div>;
}

function Metric({ icon, title, count, detail }: { icon: React.ReactNode; title: string; count: number; detail: string }) {
  return <div className="space-y-1 px-3 py-3.5 sm:px-4 sm:py-4 xl:px-5">
    <div className="flex items-start gap-1.5 text-xs font-semibold text-quiet sm:text-sm"><span className="mt-0.5 shrink-0 text-accent-ink [&>svg]:size-4">{icon}</span>{title}</div>
    <p className="text-[29px] leading-tight font-semibold tracking-tight tabular-nums">{count}</p>
    <p className="text-xs text-quiet">{detail}</p>
  </div>;
}
