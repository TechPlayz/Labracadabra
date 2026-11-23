import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Surface = HTMLAttributes<HTMLDivElement> & { interactive?: boolean };

export function Card({ className, interactive, ...props }: Surface) {
  return <div className={cn("panel min-w-0", interactive && "transition-colors hover:border-accent/50", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("section-title", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-quiet", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3 flex items-center justify-between border-t border-line p-5 pt-4", className)} {...props} />;
}
