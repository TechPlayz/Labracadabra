"use client";

import Link from "next/link";
import { useState } from "react";
import { Scale } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Feedback, formatDay, formatSession, PageHeading, Status } from "@/components/ui/WorkspaceUI";
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
    <Card className="flex flex-wrap items-start gap-4 border-violet-500/30 p-5">
      <Scale className="size-6 shrink-0 text-violet-300" />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="text-lg font-semibold">How requests are ranked</h2>
        <p className="text-sm text-slate-300">Deadline proximity is worth up to {fairnessWeights.deadline} points, time waiting adds up to {fairnessWeights.waiting}, and limited recent access adds up to {fairnessWeights.access}. Earlier submissions win ties. Existing reservations, eligibility, laboratory hours and maintenance are checked before a slot appears.</p>
        <p className="text-sm text-slate-300">Alternatives favor the original time and equipment. Each proposal is provisional and availability is checked again when a request is submitted or approved.</p>
      </div>
    </Card>
    {proposals.length === 0 && <Card className="space-y-2 p-6"><h2 className="text-lg font-semibold">No visible conflicts</h2>
      <p className="text-sm text-slate-300">{workspace.actor.role === "student" ? "Your personal view includes conflicts with confirmed campus reservations. Faculty can compare competing requests in their review scope." : "Competing pending and waitlisted requests in your review scope appear here."}</p></Card>}
    {proposals.map(({ request, project, factors, recentHours, score, suggestion, alternatives }) => {
      const resource = workspace.equipment.find((entry) => entry.id === request.equipmentId);
      const busy = workspace.occupied.filter((item) => overlap(item, request));
      const matches = proposals.filter((item) => item.request.id !== request.id && overlap(item.request, request));
      return <Card key={request.id} className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold">{project?.title ?? resource?.name}</h2>
            <p className="mt-1 text-sm text-slate-300">{resource?.name} · {formatSession(request.start, request.end)}</p></div>
          <Status status={request.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {project && <Badge variant="warning">Due {formatDay(project.deadline)}</Badge>}
          <Badge variant="violet">{score.toFixed(1)} priority points</Badge>
          {project?.capabilities.map((capability) => <Badge key={capability}>{capability.replaceAll("-", " ")}</Badge>)}
        </div>
        <p className="text-sm text-slate-300">Deadline {factors.deadline.toFixed(1)} · Wait {factors.waiting.toFixed(1)} · Prior access {factors.access.toFixed(1)} ({recentHours.toFixed(1)} hours in the last 30 days)</p>
        <Explanation id={request.id} factors={factors} />
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-slate-800 p-3">
            <h3 className="font-semibold">Availability timeline</h3>
            <p className="text-sm text-slate-300">Requested · {formatSession(request.start, request.end)}</p>
            {matches.map((item) => <p key={item.request.id} className="text-sm text-amber-200">Competing · {item.project?.title ?? "Another project"} · {formatSession(item.request.start, item.request.end)}</p>)}
            {busy.map((item) => <p key={item.start} className="text-sm text-amber-200">Confirmed · {formatSession(item.start, item.end)}</p>)}
          </div>
          <div className="space-y-2 rounded-xl border border-violet-500/30 bg-violet-950/20 p-3">
            <h3 className="font-semibold">Suggested allocation</h3>
            {suggestion ? [suggestion, ...alternatives].map((option, index) => {
              const match = workspace.equipment.find((item) => item.id === option.equipmentId);
              const details = `${match?.name} · ${match?.department} · ${formatSession(option.start, option.end)}`;
              return <div key={option.unitId + option.start} className={index === 0 ? "text-sm text-cyan-100" : "text-sm text-slate-300"}>
                {request.ownerId === workspace.actor.id ? <Link className="underline decoration-violet-500 underline-offset-3" href={slotLink(option, request.projectId)}>{details}</Link> : details}
                {index === 0 && <p className="mt-1 text-xs text-slate-300">{match?.requiresApproval ? "Faculty approval required" : "Eligible for student confirmation"}</p>}
              </div>;
            }) : <p className="text-sm text-slate-300">No feasible allocation in the search window and before the project deadline.</p>}
          </div>
        </div>
      </Card>;
    })}
  </div>;
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
    {result && <p role="status" className="rounded-lg border border-slate-800 p-3 text-sm text-slate-300">
      <span className="font-semibold text-cyan-200">{result.source}</span> · {statements[result.focus]} This factor contributed {factors[result.focus].toFixed(1)} points.
    </p>}
    <Feedback error={error} />
  </div>;
}
