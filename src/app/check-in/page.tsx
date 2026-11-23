"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Feedback, PageHeading } from "@/components/ui/WorkspaceUI";

export default function CheckInPage() {
  return <AppLayout><CheckIn /></AppLayout>;
}

function CheckIn() {
  const { workspace, submit } = useCampus();
  const [pass, setPass] = useState(() => typeof window === "undefined" ? "" : window.location.hash.slice(1));
  const [notice, setNotice] = useState({ error: "", message: "" });
  const [busy, setBusy] = useState(false);
  if (!workspace) return null;
  if (workspace.actor.role === "student") return <Card className="p-5"><h1 className="text-xl font-semibold">Lab staff access required</h1></Card>;

  async function record(action: "in" | "out") {
    setBusy(true); setNotice({ error: "", message: "" });
    try {
      await submit({ type: "checkVisit", pass: pass.trim(), action });
      setPass("");
      window.history.replaceState(null, "", window.location.pathname);
      setNotice({ error: "", message: action === "in" ? "Check-in recorded." : "Check-out recorded." });
    } catch (error) { setNotice({ error: error instanceof Error ? error.message : "Unable to record the visit.", message: "" }); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <PageHeading title="Lab check-in" description="Scan a student’s booking QR with your device camera, or enter the code from their booking pass." />
    <Card className="max-w-lg space-y-4 p-5">
      <label className="block text-sm">Booking pass code<input className="field mt-1" autoComplete="off" maxLength={36}
        value={pass} onChange={(event) => setPass(event.target.value)} /></label>
      <Feedback {...notice} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || pass.trim().length !== 36} onClick={() => void record("in")}>Record check-in</Button>
        <Button variant="outline" disabled={busy || pass.trim().length !== 36} onClick={() => void record("out")}>Record check-out</Button>
      </div>
    </Card>
  </div>;
}
