import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "violet" | "cyan" | "success" | "warning" | "danger" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    violet: "bg-violet-950/70 text-violet-300 border-violet-800/60 shadow-[0_0_12px_-3px_rgba(139,92,246,0.25)]",
    cyan: "bg-cyan-950/70 text-cyan-300 border-cyan-800/60 shadow-[0_0_12px_-3px_rgba(6,182,212,0.25)]",
    success: "bg-emerald-950/70 text-emerald-300 border-emerald-800/60",
    warning: "bg-amber-950/70 text-amber-300 border-amber-800/60",
    danger: "bg-rose-950/70 text-rose-300 border-rose-800/60",
    outline: "bg-transparent text-slate-300 border-slate-700/80",
  };

  const dotColors = {
    default: "bg-slate-400",
    violet: "bg-violet-400",
    cyan: "bg-cyan-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
    outline: "bg-slate-400",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 rounded-full font-medium tracking-wide",
    md: "text-xs px-2.5 py-1 rounded-full font-medium tracking-wide",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full animate-pulse", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
