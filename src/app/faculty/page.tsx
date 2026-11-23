"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Feedback, formatDay, formatSession, PageHeading, Status } from "@/components/ui/WorkspaceUI";
import { findAlternatives, overlap, rankRequest } from "@/lib/campus/scheduling";
import { canReview, type Reservation, type Workspace } from "@/lib/campus/types";

export default function FacultyPage() {
  return <AppLayout><ReviewQueue /></AppLayout>;
}

function ReviewQueue() {
  const { workspace } = useCampus();
  const [history, setHistory] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  if (!workspace) return null;
  if (workspace.actor.role === "student") return <Card className="p-5"><h1 className="text-xl font-semibold">Faculty access required</h1><p className="mt-2 text-sm text-quiet">Request decisions require an authorized campus reviewer.</p></Card>;
  const now = workspace.asOf;
  const scoped = workspace.requests.filter((request) => {
    const equipment = workspace.equipment.find((item) => item.id === request.equipmentId);
    return equipment && canReview(workspace.actor, equipment, request.ownerId);
  });
  const pending = scoped.filter((request) => request.status === "pending_approval" && Date.parse(request.end) > now)
    .sort((first, second) => rankRequest(workspace, second, now).score - rankRequest(workspace, first, now).score ||
      first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id));
  const visible = history ? scoped.filter((request) => !!request.decidedAt).sort((first, second) =>
    Date.parse(second.decidedAt ?? "") - Date.parse(first.decidedAt ?? "")) : pending;

  const selected = visible.find((request) => request.id === selectedId) ?? visible[0];

  return <div className="space-y-5">
    <PageHeading title="Faculty approval center" description={`Review project-based requests in ${workspace.actor.role === "super_admin" ? "your campus-wide scope" : workspace.actor.department}.`}
      action={<Button href="/conflicts" variant="outline">Review FairShare</Button>} />
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(215px,0.72fr)_minmax(0,1.65fr)]">
      <Card>
        <div className="space-y-2 border-b border-line p-3.5">
          <h2 className="section-title flex items-center gap-2"><ClipboardList className="size-4 text-accent-ink" /> Request inbox</h2>
          <div role="group" aria-label="Queue view" className="flex flex-wrap gap-1">
            <Button size="sm" aria-pressed={!history} variant={history ? "ghost" : "secondary"} onClick={() => { setHistory(false); setSelectedId(""); }}>Pending ({pending.length})</Button>
            <Button size="sm" aria-pressed={history} variant={history ? "secondary" : "ghost"} onClick={() => { setHistory(true); setSelectedId(""); }}>Decision history</Button>
          </div>
        </div>
        <ul className="divide-y divide-line p-1">
          {visible.map((item) => {
            const title = workspace.projects.find((project) => project.id === item.projectId)?.title ?? "Project request";
            return <li key={item.id}><button type="button" aria-pressed={selected?.id === item.id}
              onClick={() => setSelectedId(item.id)} className="block w-full rounded-[9px] px-3 py-2.5 text-left hover:bg-soft aria-pressed:bg-accent-soft">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-quiet">{workspace.equipment.find((entry) => entry.id === item.equipmentId)?.name}</span>
              <span className="mt-1 block text-xs text-quiet tabular-nums">{formatDay(item.start)}</span>
            </button></li>;
          })}
        </ul>
        {!selected && <p className="p-4 text-sm text-quiet">{history ? "No recorded decisions in your scope." : "No pending requests in your scope."}</p>}
      </Card>
      {visible.map((item) => <div key={`${workspace.actor.id}:${item.id}`} hidden={selected?.id !== item.id}>
        <ReviewCard item={item} workspace={workspace} pending={pending} history={history} />
      </div>)}
    </div>
  </div>;
}

function ReviewCard({ item, workspace, pending, history }: { item: Reservation; workspace: Workspace; pending: Reservation[]; history: boolean }) {
  const { submit, personas } = useCampus();
  const [comment, setComment] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [summary, setSummary] = useState<{ source: string; summary: string }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const project = workspace.projects.find((project) => project.id === item.projectId);
  const resource = workspace.equipment.find((entry) => entry.id === item.equipmentId);
  const eligible = !resource?.requiresTraining || workspace.certifications.some((entry) => entry.ownerId === item.ownerId &&
    entry.equipmentId === item.equipmentId && Date.parse(entry.expires) >= Date.parse(item.end));
  const confirmedConflict = workspace.occupied.some((entry) => overlap(item, entry));
  const competing = pending.filter((entry) => entry.id !== item.id && overlap(item, entry)).length;
  const alternatives = !history ? findAlternatives(workspace, item, workspace.asOf,
    pending.filter((entry) => entry.id !== item.id)).filter((entry) => entry.unitId !== item.unitId ||
      Date.parse(entry.start) !== Date.parse(item.start)).slice(0, 5) : [];

  async function decide(decision: "approved" | "rejected" | "alternative") {
    setError(""); setBusy(decision);
    const option = alternatives.find((entry) => entry.unitId + entry.start === suggestion);
    try { await submit({ type: "decide", id: item.id, decision, comment, suggestedStart: option?.start, suggestedUnitId: option?.unitId }); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to save decision."); }
    finally { setBusy(""); }
  }

  return <Card className="space-y-4 p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h2 className="text-xl font-semibold">{project?.title ?? "Project request"}</h2>
        <p className="mt-1 text-sm text-quiet tabular-nums">{resource?.name} · {formatSession(item.start, item.end)}</p>
        {resource && <p className="mt-0.5 text-xs text-quiet">{resource.lab} · {resource.department}</p>}</div>
      <Status status={item.status} />
    </div>
    <div className="flex flex-wrap gap-2">
      {project && <Badge variant="accent">Due {formatDay(project.deadline)}</Badge>}
      <Badge variant={eligible ? "success" : "warning"}>{eligible ? "Training eligibility satisfied" : "Training required"}</Badge>
      {confirmedConflict && !history && <Badge variant="danger">Confirmed booking overlaps</Badge>}
      {competing > 0 && !history && <Badge variant="warning">{competing} competing {competing === 1 ? "request" : "requests"}</Badge>}
    </div>
    <p className="text-sm text-quiet">Requester · {item.requesterName ?? personas.find((person) => person.id === item.ownerId)?.name ?? item.ownerId}</p>
    {project && <div className="space-y-2"><p className="text-sm text-quiet">{project.description}</p>
      <div className="flex flex-wrap gap-2">{project.capabilities.map((capability) => <Badge key={capability}>{capability.replaceAll("-", " ")}</Badge>)}</div></div>}
    <p className="rounded-lg bg-soft p-3 text-sm"><span className="font-semibold">Booking purpose</span><br />{item.purpose}</p>
    {history ? <p className="text-sm text-quiet">Decision recorded {item.decidedAt && formatDay(item.decidedAt)}{item.comment ? ` · ${item.comment}` : ""}</p> : (
      <div className="space-y-3">
        <Feedback error={error} />
        {summary && <p role="status" className="rounded-lg border border-cyan-tint p-3 text-sm"><strong>{summary.source} summary</strong> · {summary.summary}</p>}
        <Button variant="secondary" isLoading={busy === "summary"} disabled={!!busy} onClick={async () => {
          setBusy("summary"); setError("");
          try {
            const response = await fetch("/api/copilot", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "summary", id: item.id }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setSummary(result);
          } catch (error) { setError(error instanceof Error ? error.message : "Unable to summarize."); }
          finally { setBusy(""); }
        }}>Summarize request</Button>
        <label className="block text-sm">Decision note<textarea className="field mt-1" value={comment} maxLength={500} rows={2}
          onChange={(event) => setComment(event.target.value)} placeholder="Required for rejection or an alternative." /></label>
        {alternatives.length > 0 && <label className="block text-sm">Suggested time<select className="field mt-1" value={suggestion}
          onChange={(event) => setSuggestion(event.target.value)}>
          <option value="">Select an alternative</option>{alternatives.map((entry) => <option value={entry.unitId + entry.start} key={entry.unitId + entry.start}>{workspace.equipment.find((item) => item.id === entry.equipmentId)?.name} · {formatSession(entry.start, entry.end)}</option>)}
        </select></label>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void decide("approved")} disabled={!!busy || !eligible || confirmedConflict || Date.parse(item.start) <= workspace.asOf}>Approve and confirm</Button>
          <Button variant="danger" onClick={() => void decide("rejected")} disabled={!!busy || comment.trim().length < 3}>Reject with reason</Button>
          {alternatives.length > 0 && <Button variant="outline" onClick={() => void decide("alternative")} disabled={!!busy || !suggestion || comment.trim().length < 3}>Suggest alternative</Button>}
        </div>
      </div>
    )}
  </Card>;
}
