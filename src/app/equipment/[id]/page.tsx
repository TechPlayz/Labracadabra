"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Suspense, use, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EquipmentMedia } from "@/components/ui/EquipmentMedia";
import { Feedback, formatClock, formatDay, PageHeading } from "@/components/ui/WorkspaceUI";
import { campusDate, compatibleResources, openSlots, supportsProject, weekday } from "@/lib/campus/scheduling";
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
  const [date, setDate] = useState(suggestedDate && /^\d{4}-\d{2}-\d{2}$/.test(suggestedDate) && Number.isFinite(Date.parse(suggestedDate)) && suggestedDate >= today
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
      <Link href="/equipment" className="inline-flex items-center gap-2 text-sm text-accent-ink"><ArrowLeft className="size-4" /> Equipment catalog</Link>
      <PageHeading title={resource.name} description={`${resource.manufacturer} · ${resource.model}`} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <EquipmentMedia resource={resource} className="aspect-[2/1] border-b border-line" sizes="(max-width: 1279px) 95vw, 430px" eager />
            <div className="space-y-4 p-5">
            <p className="flex items-start gap-2 text-sm text-quiet"><MapPin className="size-4 shrink-0 text-accent-ink" /><span>{resource.lab}<br />{resource.location}<br />{resource.department}</span></p>
            <p className="text-sm text-quiet"><span className="mb-1 block font-semibold text-ink">Specifications</span>{resource.specifications}</p>
            <div className="flex flex-wrap gap-2">{resource.capabilities.map((item) => <Badge key={item}>{item.replaceAll("-", " ")}</Badge>)}</div>
            <div className="space-y-2 border-t border-line pt-3 text-sm text-quiet">
              <h2 className="font-semibold text-ink">Booking rules</h2>
              <p>{resource.requiresApproval ? "Faculty approval is required before confirmation." : "Open slots confirm immediately."}</p>
              {resource.requiresTraining && <p>{trained ? "Training certification on file." : "You need a current training certification for this equipment."}</p>}
              <p>Sessions run 30 minutes to four hours. Times use IST.</p>
            </div>
            </div>
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
        <Card className="space-y-4 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Clock className="size-5 text-accent-ink" /> Availability and booking</h2>
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
            <BookingCalendar date={date || today} today={today} onSelect={(value) => { setDate(value); setSelected(""); }}
              hasOpening={(day) => openSlots(workspace, [resource.id], day, duration, now,
                workspace.actor.role === "student" ? workspace.actor.id : undefined, project).length > 0} />
            <label className="flex items-center gap-2 text-sm text-quiet">
              <input type="checkbox" checked={showWaitlist} onChange={(event) => { setShowWaitlist(event.target.checked); setSelected(""); }} /> Include occupied slots with waitlist
            </label>
            {slots.length ? <fieldset className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-medium">Choose a time and unit</legend>
              {slots.map((item) => {
                const key = `${item.unitId}/${item.start}`;
                return <label key={key} className="flex items-start gap-2 cursor-pointer rounded-lg border border-line p-2.5 text-sm tabular-nums hover:border-accent/40 has-checked:border-accent has-checked:bg-accent-soft">
                  <input type="radio" name="slot" className="mt-1" checked={key === selected} onChange={() => setSelected(key)} />
                  <span>{formatClock(item.start)} – {formatClock(item.end)}<span className="block text-xs text-quiet">{workspace.units.find((unit) => unit.id === item.unitId)?.label}{item.occupied ? " · Waitlist" : ""}</span></span>
                </label>;
              })}
            </fieldset> : <p role="status" className="rounded-lg border border-line p-3 text-sm text-quiet">No eligible slots for this date and duration. Try a different date or a compatible resource.</p>}
            {canBook && <label className="block text-sm font-medium">Booking purpose<textarea name="purpose" className="field mt-1" rows={3} required minLength={10} maxLength={1000} placeholder="Describe what you’ll use this session for." /></label>}
            <div className="flex flex-wrap gap-2">
              {workspace.actor.role === "student" && (canBook
                ? <Button type="submit" disabled={!slot} isLoading={busy}>{slot?.occupied ? "Join waitlist" : "Submit booking request"}</Button>
                : <Button href="/projects" variant="outline">Create or update a project</Button>)}
              {notice.message && <Button href="/bookings" variant="outline">View my bookings</Button>}
            </div>
          </form>
        </Card>
          {alternatives.length > 0 && <Card className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">Compatible alternatives</h2>
            {alternatives.map((item) => <Link key={item.id} href={`/equipment/${item.id}`} className="block rounded-lg border border-line p-3 text-sm hover:border-accent/25">
              <span className="block font-semibold text-accent-ink">{item.name}</span><span className="text-quiet">{item.department}</span>
            </Link>)}
          </Card>}
        </div>
      </div>
    </div>
  );
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function BookingCalendar({ date, today, onSelect, hasOpening }: {
  date: string; today: string; onSelect: (date: string) => void; hasOpening: (date: string) => boolean;
}) {
  const dayMs = 86_400_000;
  const first = Date.parse(date + "T00:00:00Z") - (weekday(date) - 1) * dayMs;
  const dayAt = (offset: number) => new Date(first + offset * dayMs).toISOString().slice(0, 10);
  return <div className="space-y-2 rounded-xl border border-line bg-soft/35 p-2.5 sm:p-3">
    <div className="flex items-center justify-between gap-2">
      <button type="button" className="icon-control disabled:opacity-35" aria-label="Previous week" disabled={dayAt(-1) < today}
        onClick={() => onSelect(dayAt(-7) < today ? today : dayAt(-7))}><ChevronLeft className="size-4" /></button>
      <p className="text-center text-xs font-semibold text-quiet tabular-nums">{formatDay(dayAt(0))} – {formatDay(dayAt(6))}</p>
      <button type="button" className="icon-control" aria-label="Next week" onClick={() => onSelect(dayAt(7))}><ChevronRight className="size-4" /></button>
    </div>
    <div role="group" aria-label="Select a booking day" className="grid grid-cols-7 gap-1">
      {weekdays.map((label, index) => {
        const day = dayAt(index);
        const open = day >= today && hasOpening(day);
        return <button key={day} type="button" disabled={day < today} aria-pressed={day === date}
          aria-label={`${formatDay(day)}${open ? ", slots available" : ", no open slots"}`}
          className="flex min-w-0 flex-col items-center gap-0.5 rounded-lg border border-transparent px-0.5 py-1.5 text-xs text-quiet tabular-nums hover:bg-paper aria-pressed:border-accent/30 aria-pressed:bg-accent-soft aria-pressed:text-accent-ink disabled:opacity-45"
          onClick={() => onSelect(day)}>
          <span>{label}</span><span className="text-sm font-semibold">{day.slice(-2)}</span>
          <span aria-hidden="true" className={`size-1 rounded-full ${open ? "bg-success-ink" : "bg-transparent"}`} />
        </button>;
      })}
    </div>
  </div>;
}