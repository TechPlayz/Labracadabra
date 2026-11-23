import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "cyan" | "danger";
  size?: "sm" | "md" | "lg";
  href?: string;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variants = {
  primary: "border-accent-hover bg-accent-hover text-white shadow-sm hover:bg-accent-ink",
  secondary: "border-transparent bg-accent-soft text-accent-ink hover:border-cyan-tint",
  outline: "border-line bg-paper text-ink shadow-xs hover:border-accent hover:text-accent-ink",
  ghost: "border-transparent text-accent-ink hover:bg-accent-soft",
  cyan: "border-transparent bg-accent-soft text-accent-ink hover:border-cyan-tint",
  danger: "border-transparent bg-error-soft text-error-ink hover:border-error-ink/30",
};

const sizes = { sm: "min-h-8 px-2.5 text-xs", md: "min-h-10 px-3.5 text-sm", lg: "min-h-11 px-4 text-sm" };

export function Button({
  variant = "primary", size = "md", href, isLoading, leftIcon, rightIcon, children, className, disabled, type, ...rest
}: ButtonProps) {
  const styles = cn("inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className);
  const content = <>{isLoading ? <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" /> : leftIcon}{children}{rightIcon}</>;

  if (href) return <Link href={href} className={styles}>{content}</Link>;
  return <button type={type ?? "button"} className={styles} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...rest}>{content}</button>;
}
