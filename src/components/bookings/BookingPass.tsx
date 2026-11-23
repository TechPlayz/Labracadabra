"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { encode } from "uqr";
import { useCampus } from "@/components/layout/CampusProvider";
import { Button } from "@/components/ui/Button";
import { Feedback } from "@/components/ui/WorkspaceUI";
import { Modal } from "@/components/ui/Modal";

export function BookingPass({ id }: { id: string }) {
  const { submit } = useCampus();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const qr = url ? encode(url, { border: 4, ecc: "M" }) : null;
  const modules = qr?.data.flatMap((row, y) => row.map((dark, x) => dark ? `M${x} ${y}h1v1h-1z` : "")).join("");

  return <>
    <Button variant="outline" leftIcon={<ScanLine className="size-4" />} isLoading={pending} onClick={async () => {
      setPending(true); setError("");
      try {
        const result = await submit({ type: "issuePass", id });
        if (!result.pass) throw new Error("The booking pass is unavailable.");
        setUrl(`${window.location.origin}/check-in#${result.pass}`);
      } catch (error) { setError(error instanceof Error ? error.message : "Unable to issue the booking pass."); }
      finally { setPending(false); }
    }}>Show booking QR</Button>
    <Feedback error={error} />
    <Modal isOpen={!!qr} onClose={() => setUrl("")} title="Laboratory booking pass" description="Show this pass to lab staff when you arrive and when you leave.">
      {qr && <div className="grid justify-items-center gap-3">
        <svg viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label="Booking check-in QR code"
          className="w-full max-w-56 rounded-lg bg-white" shapeRendering="crispEdges"><path d={modules} fill="#000" /></svg>
        <p className="text-center text-sm text-slate-300">Staff can scan the QR or paste this pass code into the check-in screen.</p>
        <code className="select-all break-all text-sm text-violet-200">{url.split("#").at(-1)}</code>
      </div>}
    </Modal>
  </>;
}
