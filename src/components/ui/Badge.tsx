import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const styles = {
  default: "bg-soft text-quiet", accent: "bg-accent-soft text-accent-ink",
  success: "bg-success-soft text-success-ink", warning: "bg-warning-soft text-warning-ink",
  danger: "bg-error-soft text-error-ink", outline: "border border-line text-quiet",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof styles;
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({ className, variant = "default", size = "md", dot, children, ...props }: BadgeProps) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium", size === "sm" ? "text-[11px]" : "text-xs", styles[variant], className)} {...props}>
    {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}{children}
  </span>;
}
