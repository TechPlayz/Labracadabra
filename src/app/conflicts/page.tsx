"use client";

import Link from "next/link";
import { useState } from "react";
import { Scale } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Feedback, formatClock, formatDay, formatSession, PageHeading, Status } from "@/components/ui/WorkspaceUI";
import { fairShare, fairnessWeights, overlap } from "@/lib/campus/scheduling";
import { slotLink } from "@/lib/campus/links";

export default function ConflictsPage() {
  return <AppLayout><Conflicts /></AppLayout>;
}

function Conflicts() {
  const { workspace } = useCampus();
  if (!workspace) return null;
  const now = workspace.asOf;
  const proposals = fairShare(workspace, now);

  return <div className="space-y-6">
    <PageHeading title="FairShare conflicts" description="Compare competing requests and review feasible alternatives before committing a booking."
      action={workspace.actor.role !== "student" && <Button href="/faculty" variant="outline">Open faculty queue</Button>} />
    <Card className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
      <Scale className="size-6 shrink-0 text-accent-ink" />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="text-lg font-semibold">How requests are ranked</h2>
        <p className="text-sm text-quiet">Deadline proximity is worth up to {fairnessWeights.deadline} points, time waiting adds up to {fairnessWeights.waiting}, and limited recent access adds up to {fairnessWeights.access}. Earlier submissions win ties. Existing reservations, eligibility, laboratory hours and maintenance are checked before a slot appears.</p>
        <p className="text-sm text-quiet">Alternatives favor the original time and equipment. Each proposal is provisional and availability is checked again when a request is submitted or approved.</p>
      </div>
    </Card>
    {proposals.length === 0 && <Card className="space-y-2 p-6"><h2 className="text-lg font-semibold">No visible conflicts</h2>
      <p className="text-sm text-quiet">{workspace.actor.role === "student" ? "Your personal view includes conflicts with confirmed campus reservations. Faculty can compare competing requests in their review scope." : "Competing pending and waitlisted requests in your review scope appear here."}</p></Card>}
    {proposals.map(({ request, project, factors, recentHours, score, suggestion, alternatives }) => {
      const resource = workspace.equipment.find((entry) => entry.id === request.equipmentId);
      const busy = workspace.occupied.filter((item) => overlap(item, request));
      const matches = proposals.filter((item) => item.request.id !== request.id && overlap(item.request, request));
      return <Card key={request.id} className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold">{project?.title ?? resource?.name}</h2>
            <p className="mt-1 text-sm text-quiet">{resource?.name} · {formatSession(request.start, request.end)}</p></div>
          <Status status={request.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {project && <Badge variant="warning">Due {formatDay(project.deadline)}</Badge>}
          <Badge variant="accent">{score.toFixed(1)} priority points</Badge>
          {project?.capabilities.map((capability) => <Badge key={capability}>{capability.replaceAll("-", " ")}</Badge>)}
        </div>
        <div className="grid gap-2 rounded-xl border border-line bg-soft/40 p-3 sm:grid-cols-3">
          {([["Deadline", factors.deadline, fairnessWeights.deadline], ["Wait time", factors.waiting, fairnessWeights.waiting], ["Prior access", factors.access, fairnessWeights.access]] as const).map(([label, points, max]) => <div key={label} className="space-y-1 text-xs text-quiet">
            <div className="flex justify-between gap-2"><span>{label}</span><span className="font-semibold tabular-nums">{points.toFixed(1)} / {max}</span></div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-line" aria-hidden="true"><div className="h-full rounded-sm bg-accent" style={{width: `${100 * points / max}%`}} /></div>
          </div>)}
          <p className="text-xs text-quiet sm:col-span-3">{recentHours.toFixed(1)} hours of equipment access in the last 30 days.</p>
        </div>
        <Explanation id={request.id} factors={factors} />
        <div className="grid gap-3 lg:grid-cols-2">
          <AvailabilityTimeline rows={[
            { id: request.id, label: "Requested window", ...interval(request), style: "bg-accent" },
            ...matches.map((item) => ({ id: item.request.id, label: item.project?.title ?? "Competing project", ...interval(item.request), style: "bg-[#a9762b]" })),
            ...busy.map((item) => ({ id: item.start, label: "Confirmed booking", ...interval(item), style: "bg-quiet" })),
          ]} />
          <div className="space-y-2 rounded-xl border border-accent/25 bg-accent-soft p-3">
            <h3 className="font-semibold">Suggested allocation</h3>
            {suggestion ? [suggestion, ...alternatives].map((option, index) => {
              const match = workspace.equipment.find((item) => item.id === option.equipmentId);
              const details = `${match?.name} · ${match?.department} · ${formatSession(option.start, option.end)}`;
              return <div key={option.unitId + option.start} className={index === 0 ? "text-sm text-accent-ink" : "text-sm text-quiet"}>
                {request.ownerId === workspace.actor.id ? <Link className="underline decoration-accent underline-offset-3" href={slotLink(option, request.projectId)}>{details}</Link> : details}
                {index === 0 && <p className="mt-1 text-xs text-quiet">{match?.requiresApproval ? "Faculty approval required" : "Eligible for student confirmation"}</p>}
              </div>;
            }) : <p className="text-sm text-quiet">No feasible allocation in the search window and before the project deadline.</p>}
          </div>
        </div>
      </Card>;
    })}
  </div>;
}

function interval(item: { start: string; end: string }) {
  return { start: item.start, end: item.end };
}

function AvailabilityTimeline({ rows }: { rows: { id: string; label: string; start: string; end: string; style: string }[] }) {
  const floor = Math.min(...rows.map((row) => Date.parse(row.start)));
  const ceiling = Math.max(...rows.map((row) => Date.parse(row.end)));
  const scale = (time: string) => (Date.parse(time) - floor) / Math.max(ceiling - floor, 1) * 100;
  return <section className="space-y-3 rounded-xl border border-line p-3.5">
    <h3 className="section-title">Availability timeline</h3>
    <div className="flex justify-between text-xs font-medium text-quiet tabular-nums">
      <span>{formatClock(new Date(floor).toISOString())}</span><span>IST</span><span>{formatClock(new Date(ceiling).toISOString())}</span>
    </div>
    <ul className="space-y-3">{rows.map((row) => <li key={row.id} className="space-y-1">
      <span className="block text-sm font-semibold">{row.label}</span>
      <p className="text-xs text-quiet tabular-nums">{formatSession(row.start, row.end)}</p>
      <div className="timeline-track relative h-2 overflow-hidden rounded-sm" aria-hidden="true">
        <span className={`absolute inset-y-0 rounded-sm ${row.style}`} style={{left: `${scale(row.start)}%`, width: `${scale(row.end) - scale(row.start)}%`}} />
      </div>
    </li>)}</ul>
  </section>;
}

function Explanation({ id, factors }: { id: string; factors: ReturnType<typeof fairShare>[number]["factors"] }) {
  const [result, setResult] = useState<{ source: string; focus: keyof typeof factors }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const statements = {
    deadline: "A closer project deadline increases priority.",
    waiting: "Time in the queue gives older requests more priority.",
    access: "Less recent access to this equipment increases priority.",
  };

  return <div className="space-y-2">
    {!result && <Button variant="ghost" size="sm" isLoading={busy} onClick={async () => {
      setBusy(true); setError("");
      try {
        const response = await fetch("/api/copilot", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "conflict", id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResult(data);
      } catch (error) { setError(error instanceof Error ? error.message : "Unable to explain the current score."); }
      finally { setBusy(false); }
    }}>Explain priority</Button>}
    {result && <p role="status" className="rounded-lg border border-line p-3 text-sm text-quiet">
      <span className="font-semibold text-accent-ink">{result.source}</span> · {statements[result.focus]} This factor contributed {factors[result.focus].toFixed(1)} points.
    </p>}
    <Feedback error={error} />
  </div>;
}
