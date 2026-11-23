"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { Suspense, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EquipmentMedia } from "@/components/ui/EquipmentMedia";
import { Feedback, PageHeading } from "@/components/ui/WorkspaceUI";
import { examplePrompts, type Plan } from "@/lib/campus/planning";

export default function AssistantPage() {
  return <AppLayout><Suspense fallback={<p role="status">Loading Copilot…</p>}><PromptRoute /></Suspense></AppLayout>;
}

function PromptRoute() {
  const params = useSearchParams();
  const { workspace } = useCampus();
  const project = workspace?.projects.find((item) => item.id === params.get("project"));
  let fragment = "";
  try { fragment = decodeURIComponent(window.location.hash.slice(1)); } catch { /* Invalid fragment encoding. */ }
  const initial = (project?.description ?? params.get("prompt") ?? fragment).slice(0, 1500);
  return <Copilot key={initial} initial={initial} />;
}

function Copilot({ initial }: { initial: string }) {
  const { workspace } = useCampus();
  const [prompt, setPrompt] = useState(initial);
  const [turns, setTurns] = useState<{ prompt: string; plan: Plan }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const equipment = workspace?.equipment ?? [];

  return <div className="space-y-6">
    <PageHeading title="Wish-to-Workspace" description="Turn a project brief into a plan using the campus equipment catalog." />
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <Card className="border-accent/20 p-4 sm:p-5">
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            const description = prompt.trim();
            if (description.length < 8) return;
            setBusy(true); setError("");
            try {
              const response = await fetch("/api/copilot", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "plan", prompt: description }) });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setTurns((history) => [{ prompt: description, plan: result }, ...history].slice(0, 8));
            } catch (error) { setError(error instanceof Error ? error.message : "Unable to build a project plan."); }
            finally { setBusy(false); }
          }}>
            <label className="block text-sm font-medium">
              <span className="mb-2 flex items-center gap-2"><Sparkles className="size-5 text-accent-ink" /> What are you building?</span>
              <textarea rows={4} minLength={8} maxLength={1500} required value={prompt} onChange={(event) => setPrompt(event.target.value)}
                className="field" placeholder={examplePrompts[0]} />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-quiet">{prompt.length}/1500 characters</span>
              <Button type="submit" isLoading={busy} leftIcon={<Send className="size-4" />}>Build resource plan</Button>
            </div>
            <Feedback error={error} />
          </form>
        </Card>
        {busy && <p role="status" className="rounded-xl border border-accent/25 bg-accent-soft p-4 text-sm text-accent-ink">Matching requirements against the campus catalog…</p>}
        <div className="space-y-5" aria-label="Resource plan conversation">
          {turns.map((turn, index) => <Card key={`${turn.prompt}-${turns.length - index}`} className="min-w-0 space-y-4 p-5">
            <p className="ml-auto w-fit max-w-[90%] rounded-[11px] bg-accent-soft px-3 py-2 wrap-break-word text-sm text-accent-ink">{turn.prompt}</p>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">Project resource plan</h2><Badge variant={turn.plan.source === "Gemini" ? "accent" : "default"}>{turn.plan.source}</Badge></div>
            {turn.plan.source === "Catalog rules" && <p className="text-sm text-quiet">These recommendations use catalog matching rules.</p>}
            {!turn.plan.recommendations.length && <p role="status" className="text-sm text-quiet">No catalog capabilities matched. Describe your prototype, test methods, or the hardware you expect to use.</p>}
            <div className="flex flex-wrap gap-2">{turn.plan.capabilities.map((item) => <Badge key={item}>{item.replaceAll("-", " ")}</Badge>)}</div>
            <div className="divide-y divide-line rounded-xl border border-line">
              {turn.plan.recommendations.map((item) => {
                const resource = equipment.find((entry) => entry.id === item.equipmentId);
                if (!resource) return null;
                return <div key={item.equipmentId} className="grid min-w-0 grid-cols-[54px_minmax(0,1fr)] items-start gap-3 p-3.5 sm:grid-cols-[76px_minmax(0,1fr)]">
                  <EquipmentMedia resource={resource} className="aspect-square rounded-lg sm:aspect-[4/3]" sizes="76px" thumbnail />
                  <div className="min-w-0 space-y-1.5">
                  <p className="eyebrow">{item.stage}</p>
                  <h3 className="section-title">{resource.name}</h3>
                  <p className="text-sm text-quiet">{item.rationale}</p>
                  <p className="text-sm text-quiet">{resource.department} · {resource.lab}</p>
                  {resource.requiresApproval && <p className="text-sm text-accent-ink">Faculty approval required</p>}
                  {resource.requiresTraining && <p className="text-sm text-warning-ink">Training required</p>}
                  {item.alternatives.map((id) => <Link key={id} href={`/equipment/${id}`} className="block text-sm text-accent-ink hover:underline">
                    Alternative · {equipment.find((entry) => entry.id === id)?.name}
                  </Link>)}
                  <Button href={`/equipment/${resource.id}`} size="sm" className="mt-1" variant="outline">Check availability</Button>
                  </div>
                </div>;
              })}
            </div>
            {turn.plan.recommendations.length > 0 && <Button href="/projects" variant="secondary">Open project workspace</Button>}
          </Card>)}
        </div>
      </div>
      <Card className="space-y-3 p-4">
        <h2 className="section-title flex items-center gap-2"><MessageSquare className="size-4 text-accent-ink" /> Suggested prompts</h2>
        {examplePrompts.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)}
          className="w-full rounded-lg border border-line p-2.5 text-left text-sm text-quiet hover:bg-accent-soft hover:text-accent-ink">{example}</button>)}
      </Card>
    </div>
  </div>;
}
