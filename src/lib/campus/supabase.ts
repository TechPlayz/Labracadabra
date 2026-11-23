import type { NextRequest, NextResponse } from "next/server";
import type { Workspace } from "./types";
import { CampusError, type Command } from "./commands";

const accessCookie = "labracadabra-access";
const refreshCookie = "labracadabra-refresh";

export function mode() {
  const demo = process.env.DEMO_MODE?.trim() || undefined;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (demo === "true") return "demo";
  if (demo !== undefined && demo !== "false") return "unconfigured";
  if (url && key) return "institutional";
  if (url || key) return "unconfigured";
  return demo === undefined && process.env.NODE_ENV === "development" ? "demo" : "unconfigured";
}

interface Session { access_token: string; refresh_token: string; expires_in: number }

async function call(path: string, body: object, token?: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new CampusError("Institutional service is not configured.", 503);
  try {
    return await fetch(new URL(path, url), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(12_000),
      headers: { apikey: key, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CampusError("The campus service is temporarily unavailable.", 503);
  }
}

async function exchange(grant: string, credentials: object): Promise<Session> {
  const response = await call(`/auth/v1/token?grant_type=${grant}`, credentials);
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) throw new CampusError("Sign-in service is temporarily unavailable.", 503);
    throw new CampusError("Sign in with your campus credentials.", 401);
  }
  const session = await response.json() as Session;
  if (!session.access_token || !session.refresh_token || !session.expires_in) {
    throw new CampusError("The campus service returned an invalid session.", 503);
  }
  return session;
}

const cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" } as const;

export function writeSession(response: NextResponse, session?: Session) {
  if (!session) return response;
  response.cookies.set(accessCookie, session.access_token, { ...cookieOptions, maxAge: session.expires_in });
  response.cookies.set(refreshCookie, session.refresh_token, { ...cookieOptions, maxAge: 30 * 86400 });
  return response;
}

export function signIn(email: string, password: string) {
  return exchange("password", { email, password });
}

export async function signOut(request: NextRequest, response: NextResponse) {
  try {
    const session = await getSession(request);
    await call("/auth/v1/logout?scope=local", {}, session.token);
  } catch {
    // Clear the browser session even when remote revocation is unavailable.
  }
  response.cookies.set(accessCookie, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(refreshCookie, "", { ...cookieOptions, maxAge: 0 });
  return response;
}

export async function getSession(request: NextRequest) {
  if (mode() !== "institutional") throw new CampusError("Institutional service is not configured.", 503);
  const access = request.cookies.get(accessCookie)?.value;
  if (access) return { token: access, refreshed: undefined };
  const refresh = request.cookies.get(refreshCookie)?.value;
  if (!refresh) throw new CampusError("Sign in to access your campus workspace.", 401);
  const refreshed = await exchange("refresh_token", { refresh_token: refresh });
  return { token: refreshed.access_token, refreshed };
}

async function rpc<T>(name: string, token: string, body: object) {
  const response = await call(`/rest/v1/rpc/${name}`, body, token);
  if (response.ok) return await response.json() as T;
  if (response.status === 401) throw new CampusError("Your session expired. Sign in again.", 401);
  const error = await response.json().catch(() => ({})) as { code?: string; message?: string };
  if (error.code === "42501") throw new CampusError("Your campus profile does not have access to this action.", 403);
  if (error.code === "P0001") throw new CampusError(error.message ?? "The request could not be saved.", 409);
  if (error.code === "23P01") throw new CampusError("Another request booked this unit. Choose another slot.", 409);
  if (error.code === "23503") throw new CampusError("A selected campus record could not be found.", 400);
  throw new CampusError("The campus database could not complete the request.", 503);
}

export const campusSnapshot = (token: string) => rpc<Workspace>("campus_snapshot", token, {});
export const campusMutation = (token: string, command: Command) =>
  rpc<{ id?: string; status?: string; pass?: string }>("campus_mutate", token, { command });
