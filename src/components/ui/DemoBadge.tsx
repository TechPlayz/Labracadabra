import { Badge } from "./Badge";

export function DemoBadge({ label = "Demo", className }: { label?: string; className?: string }) {
  return <Badge variant="outline" className={className}>{label}</Badge>;
}
