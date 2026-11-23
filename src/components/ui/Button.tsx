import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "cyan" | "danger";
  size?: "sm" | "md" | "lg";
  href?: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  href,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer rounded-lg";

  const sizeStyles = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9.5 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-base gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_20px_-3px_rgba(139,92,246,0.35)] hover:shadow-[0_0_25px_-1px_rgba(139,92,246,0.5)] border border-violet-500/40 active:scale-[0.98]",
    secondary:
      "bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-800 hover:border-slate-700 shadow-sm active:scale-[0.98]",
    outline:
      "bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-600 active:scale-[0.98]",
    ghost: "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white",
    cyan: "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-[0_0_20px_-3px_rgba(6,182,212,0.35)] border border-cyan-500/40 active:scale-[0.98]",
    danger:
      "bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 active:scale-[0.98]",
  };

  const content = (
    <>
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
}
