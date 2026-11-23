import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-slate-800 bg-[#0A0F1D]/60 backdrop-blur-sm",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-violet-950/60 border border-violet-800/40 flex items-center justify-center mb-4 text-violet-400">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {(actionLabel && (onAction || actionHref)) && (
        <Button
          size="sm"
          variant="outline"
          href={actionHref}
          onClick={onAction}
          className="text-xs"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
