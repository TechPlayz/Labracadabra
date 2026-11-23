import { Badge } from "./Badge";

export function DemoBadge({ label = "Demo", className }: { label?: string; className?: string }) {
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

export function DemoBanner() {
  return <p role="status" className="rounded-lg border border-line bg-soft p-3 text-sm text-quiet">Demo workspace with sample equipment and bookings.</p>;
}
