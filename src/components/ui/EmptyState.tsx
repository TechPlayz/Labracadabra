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
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-line bg-paper",
        className
      )}
    >
      <div className="w-12 h-12 rounded-[11px] bg-accent-soft border border-accent/25 flex items-center justify-center mb-4 text-accent-ink">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-ink mb-1.5">{title}</h3>
      <p className="text-xs text-quiet max-w-sm mb-5 leading-relaxed">
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
