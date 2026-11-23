"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    const desktop = matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-label="Campus navigation"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      className="fixed top-2 bottom-2 left-2 m-0 h-auto max-h-none w-[255px] max-w-[calc(100%-1rem)] overflow-visible rounded-[19px] bg-transparent text-ink backdrop:bg-ink/30"
    >
      <button type="button" aria-label="Close menu" onClick={onClose} className="icon-control absolute top-2 right-2 z-40">
        <X className="size-5" />
      </button>
      <Sidebar className="h-full w-full" onNavigate={onClose} />
    </dialog>
  );
}
