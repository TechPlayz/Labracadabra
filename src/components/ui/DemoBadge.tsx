import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoBadge({
  className,
  label = "DEMO DATA",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase",
        "bg-violet-950/90 text-violet-300 border border-violet-700/50 shadow-sm",
        className
      )}
      title="This content reflects simulated campus preview data"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
      {label}
    </span>
  );
}

export function DemoBanner({
  message = "Preview Mode: All statistics, equipment availability, and student bookings displayed are DEMO DATA for Phase 1 preview.",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-violet-950/40 border border-violet-800/40 text-violet-300 text-xs",
        className
      )}
    >
      <Info className="w-4 h-4 text-violet-400 shrink-0" />
      <span className="font-medium text-slate-300">{message}</span>
      <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-200 border border-violet-700/60 shrink-0">
        Demo Mode
      </span>
    </div>
  );
}
