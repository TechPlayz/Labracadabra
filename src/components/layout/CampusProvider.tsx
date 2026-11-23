"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Actor, Workspace } from "@/lib/campus/types";
import type { Command } from "@/lib/campus/commands";

type Auth = { type: "persona"; id: string } | { type: "signIn"; email: string; password: string } | { type: "signOut" };
type Result = { id?: string; status?: string; pass?: string };
type Model = {
  workspace?: Workspace;
  personas: Actor[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  submit: (command: Command | Auth) => Promise<Result>;
};

const CampusContext = createContext<Model | null>(null);

export function CampusProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [personas, setPersonas] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const lastFetch = useRef(0);
  const refresh = useCallback(async () => {
    const fetchId = ++lastFetch.current;
    try {
      const response = await fetch("/api/campus", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (fetchId !== lastFetch.current) return;
      setWorkspace(data.workspace);
      setPersonas(data.personas);
      setError("");
    } catch (error) {
      if (fetchId !== lastFetch.current) return;
      setWorkspace(undefined);
      setError(error instanceof Error ? error.message : "Unable to load the campus workspace.");
    } finally { if (fetchId === lastFetch.current) setLoading(false); }
  }, []);

  useEffect(() => {
    const startup = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(startup);
  }, [refresh]);

  useEffect(() => {
    if (!workspace) return;
    const onFocus = () => { void refresh(); };
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [workspace, refresh]);

  async function submit(command: Command | Auth) {
    const response = await fetch("/api/campus", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to save your changes.");
    await refresh();
    return data as Result;
  }

  return <CampusContext.Provider value={{ workspace, personas, loading, error, refresh, submit }}>{children}</CampusContext.Provider>;
}

export function useCampus() {
  const model = useContext(CampusContext);
  if (!model) throw new Error("CampusProvider is required");
  return model;
}
