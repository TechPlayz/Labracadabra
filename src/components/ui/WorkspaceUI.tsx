import type { ReactNode } from "react";
import { Badge } from "./Badge";
import { campusZone } from "@/lib/campus/catalog";
import type { BookingStatus } from "@/lib/campus/types";

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div>
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.035em] text-ink sm:text-[36px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-quiet sm:text-base">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Feedback({ error, message }: { error?: string; message?: string }) {
  if (error) return <p role="alert" className="rounded-xl border border-error-ink/20 bg-error-soft p-3 text-sm text-error-ink">{error}</p>;
  if (message) return <p role="status" className="rounded-xl border border-success-ink/20 bg-success-soft p-3 text-sm text-success-ink">{message}</p>;
  return null;
}

const labels: Record<BookingStatus, string> = {
  pending_approval: "Pending approval", confirmed: "Confirmed", rejected: "Rejected",
  cancelled: "Cancelled", completed: "Completed", waitlisted: "Waitlisted",
};

export function Status({ status }: { status: BookingStatus }) {
  const color = status === "confirmed" ? "success" : status === "pending_approval" || status === "waitlisted" ? "warning" : status === "rejected" ? "danger" : "default";
  return <Badge variant={color} dot>{labels[status]}</Badge>;
}

const dayFormat = new Intl.DateTimeFormat("en-IN", { timeZone: campusZone, dateStyle: "medium" });
const clock = new Intl.DateTimeFormat("en-IN", { timeZone: campusZone, hour: "numeric", minute: "2-digit" });

export const formatDay = (value: string) => dayFormat.format(new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value));
export const formatClock = (value: string) => clock.format(new Date(value));
export const formatSession = (start: string, end: string) => `${formatDay(start)} · ${formatClock(start)} – ${formatClock(end)} IST`;
