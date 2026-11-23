"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ isOpen, onClose, title, description, children, footer, maxWidth = "md" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className={cn("glass-panel dialog-surface m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-[18px] text-ink shadow-xl backdrop:bg-ink/30", widths[maxWidth])}
    >
      {isOpen && (
        <div>
          <header className="flex items-start justify-between gap-3 border-b border-line p-5">
            <div>
              <h2 id={id} className="text-lg font-semibold text-ink">{title}</h2>
              {description && <p id={`${id}-description`} className="mt-1 text-sm text-quiet">{description}</p>}
            </div>
            <button type="button" aria-label="Close dialog" onClick={onClose} className="icon-control">
              <X className="size-5" />
            </button>
          </header>
          <div className="p-5">{children}</div>
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line p-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
