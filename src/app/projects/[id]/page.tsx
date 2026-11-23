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
  const sessions = workspace.requests.filter((entry) => entry.projectId === project.id);
  const matches = workspace.equipment.filter((item) => item.capabilities.some((capability) => project.capabilities.includes(capability)));
  return <div className="space-y-5">
    <Link href="/projects" className="text-sm text-violet-300">All projects</Link>
    <PageHeading title={project.title} description={project.description} action={owner && <Button onClick={() => setEdit(true)}>Edit project</Button>} />
    {saved && <Feedback message="Project updated." />}
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-sm">Deadline {formatDay(project.deadline)}</p>
        <label className="grid gap-1 text-sm">{project.progress}% complete<progress className="h-2 w-full accent-violet-500" value={project.progress} max={100} /></label>
        <h3 className="font-semibold">Team</h3>
        <p className="text-sm text-slate-300">{project.team.length ? project.team.map((id) => project.memberNames?.[id] ?? personas.find((person) => person.id === id)?.name ?? id).join(", ") : "No additional members."}</p>
      </Card>
      <Card className="space-y-3 p-5">
        <h2 className="text-xl font-semibold">Required equipment</h2>
        <div className="flex flex-wrap gap-2">{project.capabilities.map((cap) => <Badge key={cap} variant="violet">{cap.replaceAll("-", " ")}</Badge>)}</div>
        {!matches.length && <p className="text-sm text-slate-300">Add capabilities to see matching equipment.</p>}
        {matches.map((item) => <Link key={item.id} href={`/equipment/${item.id}?project=${project.id}`} className="block rounded-lg border border-slate-800 p-2 text-sm text-violet-200 hover:border-violet-500">{item.name} · {item.department}</Link>)}
      </Card>
      <Card className="space-y-3 p-5 lg:col-span-2">
        <h2 className="text-xl font-semibold">Upcoming sessions and booking history</h2>
        <p className="text-sm text-slate-300">{sessions.filter((item) => item.status === "pending_approval").length} pending faculty reviews</p>
        {sessions.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-800 p-3">
          <div><p className="font-medium">{workspace.equipment.find((resource) => resource.id === item.equipmentId)?.name}</p><p className="text-sm text-slate-300">{formatSession(item.start, item.end)}</p></div><Status status={item.status} />
        </div>)}
        {!sessions.length && <p className="text-sm text-slate-300">Book a matching resource to start scheduling lab time.</p>}
        <Button href={`/assistant?project=${project.id}`} variant="outline">Plan next steps with Copilot</Button>
      </Card>
    </div>
    {edit && <ProjectEditor open={edit} project={project} onClose={() => setEdit(false)} onSave={() => { setEdit(false); setSaved(true); }} />}
  </div>;
}
