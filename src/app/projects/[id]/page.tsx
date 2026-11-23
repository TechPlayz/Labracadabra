"use client";

import Link from "next/link";
import { use, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { ProjectEditor } from "@/components/projects/ProjectEditor";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Feedback, formatDay, formatSession, PageHeading, Status } from "@/components/ui/WorkspaceUI";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AppLayout><ProjectDetail id={id} /></AppLayout>;
}

function ProjectDetail({ id }: { id: string }) {
  const { workspace, personas } = useCampus();
  const [edit, setEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!workspace) return null;
  const project = workspace.projects.find((item) => item.id === id);
  if (!project) return <Card className="space-y-3 p-5"><h1 className="text-xl">Project unavailable</h1><Button href="/projects" variant="outline">My projects</Button></Card>;
  const owner = project.ownerId === workspace.actor.id;
  const sessions = workspace.requests.filter((entry) => entry.projectId === project.id).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const phases = [
    { name: "Plan resources", done: project.capabilities.length > 0 },
    { name: "Schedule lab time", done: sessions.some((entry) => entry.status === "confirmed" || entry.status === "completed") },
    { name: "Complete project", done: project.progress === 100 },
  ];
  const matches = workspace.equipment.filter((item) => item.capabilities.some((capability) => project.capabilities.includes(capability)));
  return <div className="space-y-5">
    <Link href="/projects" className="text-sm text-accent-ink">All projects</Link>
    <PageHeading title={project.title} description={project.description} action={owner && <Button onClick={() => setEdit(true)}>Edit project</Button>} />
    {saved && <Feedback message="Project updated." />}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
      <Card className="space-y-3 p-5">
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-sm">Deadline {formatDay(project.deadline)}</p>
        <label className="grid gap-1 text-sm">{project.progress}% complete<progress className="h-2 w-full accent-accent-hover" value={project.progress} max={100} /></label>
        <ol className="divide-y divide-line rounded-lg border border-line">{phases.map((phase) => <li key={phase.name} className="flex justify-between gap-3 px-3 py-2 text-sm">
          <span>{phase.name}</span><span className={phase.done ? "text-success-ink" : "text-quiet"}>{phase.done ? "Complete" : "Open"}</span>
        </li>)}</ol>
        <h3 className="font-semibold">Team</h3>
        <p className="text-sm text-quiet">{project.team.length ? project.team.map((id) => project.memberNames?.[id] ?? personas.find((person) => person.id === id)?.name ?? id).join(", ") : "No additional members."}</p>
      </Card>
      <Card className="space-y-3 p-5">
        <h2 className="text-xl font-semibold">Required equipment</h2>
        <div className="flex flex-wrap gap-2">{project.capabilities.map((cap) => <Badge key={cap} variant="accent">{cap.replaceAll("-", " ")}</Badge>)}</div>
        {!matches.length && <p className="text-sm text-quiet">Add capabilities to see matching equipment.</p>}
        {matches.map((item) => <Link key={item.id} href={`/equipment/${item.id}?project=${project.id}`} className="block rounded-lg border border-line p-2 text-sm text-accent-ink hover:border-accent/25">{item.name} · {item.department}</Link>)}
      </Card>
      <Card className="space-y-3 p-5 xl:col-span-2">
        <h2 className="text-xl font-semibold">Upcoming sessions and booking history</h2>
        <p className="text-sm text-quiet">{sessions.filter((item) => item.status === "pending_approval").length} pending faculty reviews</p>
        {sessions.length > 0 && <ol className="divide-y divide-line rounded-lg border border-line">
          {sessions.map((item) => <li key={item.id} className="schedule-row px-3 py-2.5 text-sm">
            <span className="font-medium">{workspace.equipment.find((resource) => resource.id === item.equipmentId)?.name}</span>
            <span className="text-xs text-quiet tabular-nums">{formatSession(item.start, item.end)}</span><Status status={item.status} />
          </li>)}
        </ol>}
        {!sessions.length && <p className="text-sm text-quiet">Book a matching resource to start scheduling lab time.</p>}
        <Button href={`/assistant?project=${project.id}`} variant="outline">Plan next steps with Copilot</Button>
      </Card>
    </div>
    {edit && <ProjectEditor open={edit} project={project} onClose={() => setEdit(false)} onSave={() => { setEdit(false); setSaved(true); }} />}
  </div>;
}
