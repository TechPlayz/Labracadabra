"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, MapPin } from "lucide-react";
import { Suspense, use, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Feedback, formatClock, PageHeading } from "@/components/ui/WorkspaceUI";
import { campusDate, compatibleResources, openSlots, supportsProject } from "@/lib/campus/scheduling";
import type { Resource, Workspace } from "@/lib/campus/types";

export default function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AppLayout><Suspense fallback={<p role="status">Loading booking form…</p>}><Detail id={id} /></Suspense></AppLayout>;
}

function Detail({ id }: { id: string }) {
  const { workspace } = useCampus();
  const query = useSearchParams();
  if (!workspace) return null;
  const resource = workspace.equipment.find((entry) => entry.id === id);
  if (!resource) return <Card className="space-y-3 p-5"><h1 className="text-xl font-semibold">Equipment unavailable</h1><Button href="/equipment" variant="outline">Browse equipment</Button></Card>;
  return <BookingForm key={`${workspace.actor.id}:${query.toString()}`} workspace={workspace} resource={resource}
    suggestedDate={query.get("date")} suggestedStart={query.get("start")} suggestedUnit={query.get("unit")} suggestedProject={query.get("project")} suggestedDuration={Number(query.get("minutes"))} />;
}

function BookingForm({ workspace, resource, suggestedDate, suggestedStart, suggestedUnit, suggestedProject, suggestedDuration }: {
  workspace: Workspace; resource: Resource; suggestedDate: string | null; suggestedStart: string | null;
  suggestedUnit: string | null; suggestedProject: string | null; suggestedDuration: number;
}) {
  const { submit } = useCampus();
  const now = workspace.asOf;
  const today = campusDate(now);
  const projects = workspace.projects.filter((project) =>
    (project.ownerId === workspace.actor.id || project.team.includes(workspace.actor.id)) && supportsProject(resource, project));
  const initialProject = projects.find((project) => project.id === suggestedProject) ?? projects[0];
  const [projectId, setProjectId] = useState(initialProject?.id ?? "");
  const project = projects.find((item) => item.id === projectId);
  const [duration, setDuration] = useState(suggestedDuration >= 30 && suggestedDuration <= 240 && suggestedDuration % 30 === 0 ? suggestedDuration : 60);
  const [date, setDate] = useState(suggestedDate && /^\d{4}-\d{2}-\d{2}$/.test(suggestedDate) && suggestedDate >= today
    ? suggestedDate : Array.from({ length: 14 }, (_, index) => campusDate(now + index * 86_400_000))
      .find((day) => openSlots(workspace, [resource.id], day, duration, now).length) ?? today);
  const [selected, setSelected] = useState(suggestedUnit && suggestedStart ? `${suggestedUnit}/${suggestedStart}` : "");
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ error: "", message: "" });
  const canBook = workspace.actor.role === "student" && !!project;
  const slots = openSlots(workspace, [resource.id], date, duration, now,
    workspace.actor.role === "student" ? workspace.actor.id : undefined, project, showWaitlist);
  const slot = slots.find((item) => selected === `${item.unitId}/${item.start}`);
  const alternatives = compatibleResources(resource, workspace.equipment, project);
  const trained = !resource.requiresTraining || workspace.certifications.some((entry) => entry.ownerId === workspace.actor.id &&
    entry.equipmentId === resource.id && Date.parse(entry.expires) > now);

  return (
    <div className="space-y-6">
      <Link href="/equipment" className="inline-flex items-center gap-2 text-sm text-violet-300"><ArrowLeft className="size-4" /> Equipment catalog</Link>
      <PageHeading title={resource.name} description={`${resource.manufacturer} · ${resource.model}`} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <p className="flex items-start gap-2 text-sm text-slate-300"><MapPin className="size-4 shrink-0 text-cyan-300" /><span>{resource.lab}<br />{resource.location}<br />{resource.department}</span></p>
            <p className="text-sm text-slate-300"><span className="mb-1 block font-semibold text-slate-100">Specifications</span>{resource.specifications}</p>
            <div className="flex flex-wrap gap-2">{resource.capabilities.map((item) => <Badge key={item}>{item.replaceAll("-", " ")}</Badge>)}</div>
            <div className="space-y-2 border-t border-slate-800 pt-3 text-sm text-slate-300">
              <h2 className="font-semibold text-slate-100">Booking rules</h2>
              <p>{resource.requiresApproval ? "Faculty approval is required before confirmation." : "Open slots confirm immediately."}</p>
              {resource.requiresTraining && <p>{trained ? "Training certification on file." : "You need a current training certification for this equipment."}</p>}
              <p>Sessions run 30 minutes to four hours. Times use IST.</p>
            </div>
          </Card>
          {alternatives.length > 0 && <Card className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">Compatible alternatives</h2>
            {alternatives.map((item) => <Link key={item.id} href={`/equipment/${item.id}`} className="block rounded-lg border border-slate-800 p-3 text-sm hover:border-violet-500/60">
              <span className="block font-semibold text-violet-200">{item.name}</span><span className="text-slate-300">{item.department}</span>
            </Link>)}
          </Card>}
        </div>
        <Card className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Clock className="size-5 text-cyan-300" /> Availability and booking</h2>
          <Feedback {...notice} />
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            if (!slot || !canBook) return;
            const purpose = String(new FormData(event.currentTarget).get("purpose") ?? "");
            setNotice({ error: "", message: "" }); setBusy(true);
            try {
              const result = await submit({ type: "request", projectId, unitId: slot.unitId, start: slot.start, end: slot.end, purpose });
              setSelected("");
              setNotice({ error: "", message: result.status === "confirmed" ? "Booking confirmed." :
                result.status === "waitlisted" ? "Request added to the waitlist." : "Request submitted for faculty approval." });
            } catch (error) { setNotice({ error: error instanceof Error ? error.message : "Could not save this booking.", message: "" }); }
            finally { setBusy(false); }
          }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-medium">Campus date<input type="date" className="field mt-1" required min={today} value={date}
                onChange={(event) => { setDate(event.target.value); setSelected(""); }} /></label>
              <label className="min-w-0 text-sm font-medium">Duration<select className="field mt-1" value={duration}
                onChange={(event) => { setDuration(Number(event.target.value)); setSelected(""); }}>
                {[30, 60, 90, 120, 150, 180, 210, 240].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></label>
            </div>
            {workspace.actor.role === "student" && (
              <label className="block text-sm font-medium">Project<select className="field mt-1" required value={projectId}
                onChange={(event) => { setProjectId(event.target.value); setSelected(""); }}>
                <option value="">Choose an eligible project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select></label>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={showWaitlist} onChange={(event) => { setShowWaitlist(event.target.checked); setSelected(""); }} /> Include occupied slots with waitlist
            </label>
            {slots.length ? <fieldset className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-medium">Choose a time and unit</legend>
              {slots.map((item) => {
                const key = `${item.unitId}/${item.start}`;
                return <label key={key} className="flex items-start gap-2 rounded-lg border border-slate-700 p-2.5 text-sm has-checked:border-violet-400 has-checked:bg-violet-950/50">
                  <input type="radio" name="slot" className="mt-1" checked={key === selected} onChange={() => setSelected(key)} />
                  <span>{formatClock(item.start)} – {formatClock(item.end)}<span className="block text-xs text-slate-300">{workspace.units.find((unit) => unit.id === item.unitId)?.label}{item.occupied ? " · Waitlist" : ""}</span></span>
                </label>;
              })}
            </fieldset> : <p role="status" className="rounded-lg border border-slate-800 p-3 text-sm text-slate-300">No eligible slots for this date and duration. Try a different date or a compatible resource.</p>}
            {canBook && <label className="block text-sm font-medium">Booking purpose<textarea name="purpose" className="field mt-1" rows={3} required minLength={10} maxLength={1000} placeholder="Describe what you’ll use this session for." /></label>}
            <div className="flex flex-wrap gap-2">
              {workspace.actor.role === "student" && (canBook
                ? <Button type="submit" disabled={!slot} isLoading={busy}>{slot?.occupied ? "Join waitlist" : "Submit booking request"}</Button>
                : <Button href="/projects" variant="outline">Create or update a project</Button>)}
              {notice.message && <Button href="/bookings" variant="outline">View my bookings</Button>}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
