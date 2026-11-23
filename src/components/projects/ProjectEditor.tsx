"use client";

import { useState } from "react";
import { useCampus } from "@/components/layout/CampusProvider";
import { Button } from "@/components/ui/Button";
import { Feedback } from "@/components/ui/WorkspaceUI";
import { Modal } from "@/components/ui/Modal";
import { campusDate } from "@/lib/campus/scheduling";
import type { Project } from "@/lib/campus/types";

export function ProjectEditor({ project, open, onClose, onSave }: {
  project?: Project; open: boolean; onClose: () => void; onSave: (id?: string) => void;
}) {
  const { workspace, personas, submit } = useCampus();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const capabilities = [...new Set([...(project?.capabilities ?? []), ...(workspace?.equipment.flatMap((item) => item.capabilities) ?? [])])].sort();
  const demoMembers = personas.filter((person) => person.role === "student" && person.id !== workspace?.actor.id);

  return (
    <Modal isOpen={open} title={project ? "Edit project" : "Create project"} onClose={onClose}>
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const team = demoMembers.length ? data.getAll("member").map(String) :
          String(data.get("members") ?? "").split(/[\s,]+/).filter(Boolean);
        setSaving(true); setError("");
        try {
          const result = await submit({ type: "saveProject", id: project?.id,
            title: String(data.get("title")), description: String(data.get("description")),
            deadline: String(data.get("deadline")), progress: Number(data.get("progress") ?? 0),
            capabilities: data.getAll("capability").map(String), team });
          onSave(result.id);
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to save the project."); }
        finally { setSaving(false); }
      }}>
        <Feedback error={error} />
        <label className="block text-sm">Project title<input name="title" className="field mt-1" required minLength={3} maxLength={100} defaultValue={project?.title} /></label>
        <label className="block text-sm">Project description<textarea name="description" className="field mt-1" required rows={3} minLength={10} maxLength={2000} defaultValue={project?.description} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm">Project deadline<input name="deadline" type="date" min={project ? undefined : campusDate(workspace?.asOf ?? 0)} className="field mt-1" required defaultValue={project?.deadline} /></label>
          <label className="min-w-0 text-sm">Progress (%)<input name="progress" type="number" min={0} max={100} className="field mt-1" required defaultValue={project?.progress ?? 0} /></label>
        </div>
        {capabilities.length > 0 && <fieldset className="grid max-h-36 gap-2 overflow-auto rounded-lg border border-slate-700 p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm">Required capabilities</legend>
          {capabilities.map((capability) => <label key={capability} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="capability" value={capability} defaultChecked={project?.capabilities.includes(capability)} />{capability.replaceAll("-", " ")}
          </label>)}
        </fieldset>}
        {demoMembers.length ? <fieldset className="space-y-2"><legend className="text-sm">Add team members</legend>
          {demoMembers.map((person) => <label key={person.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="member" value={person.id} defaultChecked={project?.team.includes(person.id)} />{person.name}
          </label>)}
        </fieldset> : <label className="block text-sm">Team member campus IDs
          <input name="members" className="field mt-1" defaultValue={project?.team.join(", ")} />
          <span className="mt-1 block text-xs text-slate-400">Enter comma-separated membership IDs from your campus administrator.</span>
        </label>}
        <div className="flex flex-wrap gap-2"><Button type="submit" isLoading={saving}>Save project</Button><Button type="button" onClick={onClose} variant="outline">Cancel</Button></div>
      </form>
    </Modal>
  );
}
