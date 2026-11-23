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
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-hidden bg-[#090D18] text-slate-100 backdrop:bg-black/70"
    >
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute right-2 top-3 z-40 rounded-lg p-2 text-slate-300 hover:bg-slate-800">
        <X className="size-5" />
      </button>
      <Sidebar className="h-dvh w-full" onNavigate={onClose} />
    </dialog>
  );
}
