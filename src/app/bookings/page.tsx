"use client";

import { useState } from "react";
import Link from "next/link";
import { BookingPass } from "@/components/bookings/BookingPass";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Feedback, formatSession, PageHeading, Status } from "@/components/ui/WorkspaceUI";
import { findAlternatives } from "@/lib/campus/scheduling";
import { slotLink } from "@/lib/campus/links";
import type { Reservation } from "@/lib/campus/types";

export default function BookingsPage() {
  return <AppLayout><Bookings /></AppLayout>;
}

const filters = ["Upcoming and pending", "History", "All"] as const;

function Bookings() {
  const { workspace, submit } = useCampus();
  const [filter, setFilter] = useState<typeof filters[number]>("Upcoming and pending");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState({ error: "", message: "" });
  if (!workspace) return null;
  const now = workspace.asOf;
  const open = (item: Reservation) => ["pending_approval", "confirmed", "waitlisted"].includes(item.status) && Date.parse(item.end) > now;
  const entries = workspace.requests.filter((item) => item.ownerId === workspace.actor.id &&
    (filter === "All" || (filter === "History" ? !open(item) : open(item))));

  async function update(type: "cancel" | "retry", id: string) {
    setFeedback({ error: "", message: "" }); setBusy(id);
    try {
      const result = await submit({ type, id });
      setFeedback({ error: "", message: type === "cancel" ? "Request cancelled." :
        result.status === "confirmed" ? "Booking confirmed." : "Request sent for faculty approval." });
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : "Unable to update the request.", message: "" });
    } finally { setBusy(""); }
  }

  return <div className="space-y-5">
    <PageHeading title="My bookings" description="Track requests, upcoming lab sessions, and faculty decisions."
      action={<Button href="/equipment">Browse equipment</Button>} />
    <Feedback {...feedback} />
    <div className="flex flex-wrap gap-2" aria-label="Booking filters">
      {filters.map((item) => <Button key={item} aria-pressed={filter === item} variant={filter === item ? "primary" : "outline"} onClick={() => setFilter(item)}>{item}</Button>)}
    </div>
    {!entries.length && <Card className="p-6 text-slate-300">No bookings in this view.</Card>}
    <div className="space-y-3">
      {entries.map((item) => {
        const resource = workspace.equipment.find((entry) => entry.id === item.equipmentId);
        const project = workspace.projects.find((entry) => entry.id === item.projectId);
        const options = item.status === "waitlisted" ? findAlternatives(workspace, item, now).slice(0, 2) : [];
        return <Card key={item.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="text-lg font-semibold"><Link href={`/equipment/${item.equipmentId}`} className="hover:text-violet-200">{resource?.name ?? "Equipment"}</Link></h2>
              <p className="text-sm text-slate-300">{formatSession(item.start, item.end)} · {resource?.department}</p></div>
            <Status status={item.status} />
          </div>
          {project && <Link href={`/projects/${project.id}`} className="block text-sm text-violet-300">{project.title}</Link>}
          <p className="text-sm text-slate-300">{item.purpose}</p>
          {item.checkedInAt && <p className="text-sm text-cyan-200">{item.checkedOutAt ? "Lab visit checked out" : "Lab visit checked in"}</p>}
          {["confirmed", "completed"].includes(item.status) && !item.checkedOutAt &&
            Date.parse(item.end) + 86_400_000 > now && (item.status === "confirmed" || item.checkedInAt) && <BookingPass id={item.id} />}
          {item.comment && <p className="rounded-lg bg-slate-950/50 p-3 text-sm">Faculty note · {item.comment}</p>}
          {item.suggestedStart && <Link className="block text-sm text-violet-300" href={slotLink({
            ...item, start: item.suggestedStart, unitId: item.suggestedUnitId ?? item.unitId, equipmentId: item.suggestedEquipmentId ?? item.equipmentId,
            end: new Date(Date.parse(item.suggestedStart) + Date.parse(item.end) - Date.parse(item.start)).toISOString(),
          }, item.projectId)}>Review faculty’s suggested slot</Link>}
          {options.length > 0 && <div className="space-y-1 text-sm">
            <h3 className="font-semibold">Available alternatives</h3>
            {options.map((option) => <Link key={option.unitId + option.start} className="block text-violet-300" href={slotLink(option, item.projectId)}>
              {workspace.equipment.find((entry) => entry.id === option.equipmentId)?.name} · {formatSession(option.start, option.end)}
            </Link>)}
          </div>}
          {Date.parse(item.start) > now && open(item) && (
            <div className="flex flex-wrap gap-2">
              {item.status === "waitlisted" && <Button disabled={!!busy} onClick={() => void update("retry", item.id)} variant="outline">Try original slot again</Button>}
              <Button disabled={!!busy} onClick={() => void update("cancel", item.id)} variant="danger">Cancel request</Button>
              {item.status !== "confirmed" && <Button href="/conflicts" variant="ghost">Open FairShare</Button>}
            </div>
          )}
        </Card>;
      })}
    </div>
  </div>;
}
