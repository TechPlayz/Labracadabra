"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FlaskConical, Send, Sparkles } from "lucide-react";
import { Suspense, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <PageHeading title="Wish-to-Workspace" description="Describe your idea. The lab copilot connects project requirements to campus equipment and available booking forms." />
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <Card className="hero-mesh p-5 sm:p-6">
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
              <span className="mb-2 flex items-center gap-2"><Sparkles className="size-5 text-violet-300" /> What are you building?</span>
              <textarea rows={4} minLength={8} maxLength={1500} required value={prompt} onChange={(event) => setPrompt(event.target.value)}
                className="field" placeholder={examplePrompts[0]} />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-300">{prompt.length}/1500 characters</span>
              <Button type="submit" isLoading={busy} leftIcon={<Send className="size-4" />}>Build resource plan</Button>
            </div>
            <Feedback error={error} />
          </form>
        </Card>
        {busy && <p role="status" className="rounded-xl border border-violet-900 bg-violet-950/30 p-4 text-sm text-violet-200">Matching requirements against the campus catalog…</p>}
        <div className="space-y-5" aria-label="Resource plan conversation">
          {turns.map((turn, index) => <Card key={`${turn.prompt}-${turns.length - index}`} className="min-w-0 space-y-4 p-5">
            <p className="ml-4 rounded-xl bg-violet-950/45 p-3 wrap-break-word text-sm text-violet-100 sm:ml-12">{turn.prompt}</p>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">Project resource plan</h2><Badge variant={turn.plan.source === "Gemini" ? "violet" : "cyan"}>{turn.plan.source}</Badge></div>
            {turn.plan.source === "Catalog rules" && <p className="text-sm text-slate-300">These recommendations use catalog matching rules.</p>}
            {!turn.plan.recommendations.length && <p role="status" className="text-sm text-slate-300">No catalog capabilities matched. Describe your prototype, test methods, or the hardware you expect to use.</p>}
            <div className="flex flex-wrap gap-2">{turn.plan.capabilities.map((item) => <Badge key={item}>{item.replaceAll("-", " ")}</Badge>)}</div>
            <div className="grid gap-3 md:grid-cols-2">
              {turn.plan.recommendations.map((item) => {
                const resource = equipment.find((entry) => entry.id === item.equipmentId);
                if (!resource) return null;
                return <div key={item.equipmentId} className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                  <p className="eyebrow">{item.stage}</p>
                  <h3 className="flex items-start gap-2 text-base font-semibold"><FlaskConical className="mt-0.5 size-4 shrink-0 text-violet-300" />{resource.name}</h3>
                  <p className="text-sm text-slate-300">{item.rationale}</p>
                  <p className="text-sm text-slate-300">{resource.department} · {resource.lab}</p>
                  {resource.requiresApproval && <p className="text-sm text-violet-200">Faculty approval required</p>}
                  {resource.requiresTraining && <p className="text-sm text-amber-200">Training required</p>}
                  {item.alternatives.map((id) => <Link key={id} href={`/equipment/${id}`} className="text-sm text-cyan-200 hover:underline">
                    Alternative · {equipment.find((entry) => entry.id === id)?.name}
                  </Link>)}
                  <Button href={`/equipment/${resource.id}`} className="mt-auto self-start" variant="outline">Check availability</Button>
                </div>;
              })}
            </div>
            {turn.plan.recommendations.length > 0 && <Button href="/projects" variant="secondary">Open project workspace</Button>}
          </Card>)}
        </div>
      </div>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Try a project idea</h2>
        {examplePrompts.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)}
          className="w-full rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-left text-sm text-slate-200 hover:border-violet-500">{example}</button>)}
      </Card>
    </div>
  </div>;
}
