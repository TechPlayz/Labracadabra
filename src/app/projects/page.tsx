"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { ProjectEditor } from "@/components/projects/ProjectEditor";
import { Badge } from "@/components/ui/Badge";
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
    {projects.length ? <div className="grid gap-4 lg:grid-cols-2">
      {projects.map((project) => <Card key={project.id} className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="text-xl font-semibold">{project.title}</h2><Badge variant="violet">Due {formatDay(project.deadline)}</Badge></div>
        <p className="text-sm text-slate-300">{project.description}</p>
        <label className="grid gap-1 text-sm">{project.progress}% complete<progress value={project.progress} max={100} className="h-2 w-full accent-violet-500" /></label>
        <Button href={`/projects/${project.id}`} variant="outline" className="mt-auto self-start">Open project</Button>
      </Card>)}
    </div> : <Card className="p-6 text-slate-300">You have no projects yet.{student && " Create a project to request equipment and track its bookings."}</Card>}
    {open && student && <ProjectEditor open={open} onClose={() => setOpen(false)} onSave={(id) => { setOpen(false); if (id) router.push(`/projects/${id}`); }} />}
  </div>;
}
