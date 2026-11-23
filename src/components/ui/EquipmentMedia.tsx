import Image from "next/image";
import { Boxes, Cpu, FlaskConical, Gauge, Monitor, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Resource } from "@/lib/campus/types";

export function EquipmentMedia({ resource, className, sizes = "(max-width: 640px) 100vw, 360px", thumbnail = false, eager = false }: {
  resource: Resource; className?: string; sizes?: string; thumbnail?: boolean; eager?: boolean;
}) {
  const name = resource.name.toLowerCase();
  const kind = name.includes("raspberry pi") ? "single-board"
    : resource.capabilities.includes("gpu") ? "workstation"
    : name.includes("3d printer") ? "printer"
    : name.includes("oscilloscope") ? "oscilloscope" : "";
  const Icon = resource.capabilities.includes("gpio") ? Cpu
    : resource.category === "Testing and Measurement" ? Gauge
    : resource.category === "Mechanical and Prototyping" ? Wrench
    : resource.category === "Robotics" ? Boxes
    : resource.category === "Research Workstations" ? Monitor : FlaskConical;

  return <div className={cn("media-placeholder relative grid shrink-0 place-items-center overflow-hidden", className)}>
    {kind ? <Image fill sizes={sizes} loading={eager ? "eager" : "lazy"} className="object-cover" alt={thumbnail ? "" : `Representative image of ${resource.name}`} src={`/equipment/${kind}.jpg`} />
      : <Icon className={thumbnail ? "size-5" : "size-10"} strokeWidth={1.25} aria-hidden="true" />}
  </div>;
}
