"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Feedback, formatSession, PageHeading } from "@/components/ui/WorkspaceUI";
import { campusOffset } from "@/lib/campus/catalog";
import type { Command } from "@/lib/campus/commands";

export default function AdminPage() {
  return <AppLayout><Administration /></AppLayout>;
}

function Administration() {
  const { workspace, submit } = useCampus();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", message: "" });
  if (!workspace) return null;
  const { actor } = workspace;
  if (!["super_admin", "lab_admin"].includes(actor.role)) return <Card className="p-6">Laboratory administrator access required.</Card>;
  const resources = workspace.equipment.filter((item) => actor.role === "super_admin" || item.department === actor.department);
  const unit = workspace.units.find((item) => item.id === selected);

  async function change(command: Command) {
    setBusy(true); setFeedback({ error: "", message: "" });
    try {
      await submit(command);
      setSelected("");
      setFeedback({ error: "", message: command.type === "setMaintenance" ? "Maintenance scheduled." : "Unit status updated." });
    } catch (error) { setFeedback({ error: error instanceof Error ? error.message : "Unable to update the unit.", message: "" }); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <PageHeading title="Lab administration" description="Manage physical unit status and schedule maintenance in your authorized department." />
    <Feedback {...feedback} />
    <div className="grid gap-4 xl:grid-cols-2">
      {resources.map((item) => <Card key={item.id} className="space-y-3 p-5">
        <div><h2 className="text-lg font-semibold">{item.name}</h2><p className="text-sm text-slate-300">{item.department} · {item.lab}</p></div>
        {workspace.units.filter((unit) => unit.equipmentId === item.id).map((unit) => <div key={unit.id} className="space-y-2 rounded-xl border border-slate-800 p-3">
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{unit.label}</p><Badge variant={unit.operational ? "success" : "warning"}>{unit.operational ? "Operational" : "Offline"}</Badge></div>
          {workspace.maintenance.filter((item) => item.unitId === unit.id && Date.parse(item.end) > workspace.asOf).map((block) => <p key={block.start} className="text-sm text-amber-200">Maintenance · {formatSession(block.start, block.end)}</p>)}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} variant="outline" onClick={() => void change({ type: "setOperational", id: unit.id, operational: !unit.operational })}>{unit.operational ? "Take offline" : "Mark operational"}</Button>
            <Button disabled={busy} variant="secondary" onClick={() => { setSelected(unit.id); setFeedback({ error: "", message: "" }); }}>Schedule maintenance</Button>
          </div>
        </div>)}
      </Card>)}
    </div>
    {!resources.length && <Card className="p-5 text-slate-300">No equipment is assigned to your scope.</Card>}
    <Modal title="Schedule maintenance" isOpen={!!unit} onClose={() => setSelected("")}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        if (!unit) return;
        const form = new FormData(event.currentTarget);
        const start = new Date(String(form.get("start")) + campusOffset);
        const end = new Date(String(form.get("end")) + campusOffset);
        if (!Number.isFinite(+start) || !Number.isFinite(+end)) { setFeedback({ error: "Enter valid campus times.", message: "" }); return; }
        void change({ type: "setMaintenance", unitId: unit.id, start: start.toISOString(), end: end.toISOString() });
      }}>
        <Feedback error={feedback.error} />
        <label className="block text-sm">Start (IST)<input type="datetime-local" required name="start" className="field mt-1" /></label>
        <label className="block text-sm">End (IST)<input type="datetime-local" required name="end" className="field mt-1" /></label>
        <Button type="submit" isLoading={busy}>Schedule maintenance</Button>
      </form>
    </Modal>
  </div>;
}
