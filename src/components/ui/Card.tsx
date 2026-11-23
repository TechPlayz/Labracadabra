import React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  hoverGlow = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hoverGlow?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800/80 bg-[#0F1626]/85 backdrop-blur-sm text-slate-100 transition-all duration-200",
        hoverGlow &&
          "hover:border-violet-500/40 hover:bg-[#131D32] hover:shadow-[0_4px_25px_-5px_rgba(139,92,246,0.15)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pb-3 flex flex-col gap-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold tracking-tight text-white flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-slate-400 leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pt-2", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-5 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-3 pt-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
