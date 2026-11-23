import type { ReactNode } from "react";
import { Badge } from "./Badge";
import { campusZone } from "@/lib/campus/catalog";
import type { BookingStatus } from "@/lib/campus/types";

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Feedback({ error, message }: { error?: string; message?: string }) {
  if (error) return <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>;
  if (message) return <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{message}</p>;
  return null;
}

const labels: Record<BookingStatus, string> = {
  pending_approval: "Pending approval", confirmed: "Confirmed", rejected: "Rejected",
  cancelled: "Cancelled", completed: "Completed", waitlisted: "Waitlisted",
};

export function Status({ status }: { status: BookingStatus }) {
  const color = status === "confirmed" ? "success" : status === "pending_approval" || status === "waitlisted" ? "warning" : "default";
  return <Badge variant={color}>{labels[status]}</Badge>;
}

const dayFormat = new Intl.DateTimeFormat("en-IN", { timeZone: campusZone, dateStyle: "medium" });
const clock = new Intl.DateTimeFormat("en-IN", { timeZone: campusZone, hour: "numeric", minute: "2-digit" });

export const formatDay = (value: string) => dayFormat.format(new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value));
export const formatClock = (value: string) => clock.format(new Date(value));
export const formatSession = (start: string, end: string) => `${formatDay(start)} · ${formatClock(start)} – ${formatClock(end)} IST`;
