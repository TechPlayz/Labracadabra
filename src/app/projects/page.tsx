"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { ProjectEditor } from "@/components/projects/ProjectEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDay, PageHeading } from "@/components/ui/WorkspaceUI";

export default function ProjectsPage() {
  return <AppLayout><Projects /></AppLayout>;
}

function Projects() {
  const { workspace } = useCampus();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!workspace) return null;
  const projects = workspace.projects.filter((item) => item.ownerId === workspace.actor.id || item.team.includes(workspace.actor.id));
  const student = workspace.actor.role === "student";

  return <div className="space-y-6">
    <PageHeading title="Project workspace" description="Track deadlines, equipment requirements, and lab sessions for each project."
      action={student && <Button onClick={() => setOpen(true)} leftIcon={<Plus className="size-4" />}>New project</Button>} />
    {projects.length ? <Card className="divide-y divide-line">
      <div className="grid items-center gap-3 px-4 py-3 text-xs font-semibold text-quiet sm:grid-cols-[minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] sm:px-5">
        <span>Project</span><span className="hidden sm:block">Deadline</span><span className="hidden sm:block">Progress</span><span className="hidden w-[84px] sm:block" />
      </div>
      {projects.map((project) => <article key={project.id} className="grid items-center gap-3 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink"><FolderOpen className="size-4" /></span>
          <div className="min-w-0"><h2 className="section-title">{project.title}</h2><p className="line-clamp-2 text-sm text-quiet">{project.description}</p></div>
        </div>
        <p className="text-sm text-quiet tabular-nums"><span className="sm:sr-only">Due </span>{formatDay(project.deadline)}</p>
        <label className="grid max-w-xs gap-1 text-xs font-medium text-quiet tabular-nums">{project.progress}% complete<progress value={project.progress} max={100} className="h-2 w-full" /></label>
        <Button href={`/projects/${project.id}`} variant="outline" size="sm" className="justify-self-start">Open project</Button>
      </article>)}
    </Card> : <Card className="p-6 text-quiet">You have no projects yet.{student && " Create a project to request equipment and track its bookings."}</Card>}
    {open && student && <ProjectEditor open={open} onClose={() => setOpen(false)} onSave={(id) => { setOpen(false); if (id) router.push(`/projects/${id}`); }} />}
  </div>;
}
