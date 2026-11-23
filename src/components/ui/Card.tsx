import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Surface = HTMLAttributes<HTMLDivElement> & { interactive?: boolean };

export function Card({ className, interactive, ...props }: Surface) {
  return <div className={cn("panel min-w-0", interactive && "transition-colors hover:border-accent/50", className)} {...props} />;
}
