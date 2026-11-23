import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/campus/origin";
import { CampusError, commandSchema } from "@/lib/campus/commands";
import { demoActor, demoMutation, demoWorkspace, personas } from "@/lib/campus/demo";
import { campusMutation, campusSnapshot, getSession, mode, signIn, signOut, writeSession } from "@/lib/campus/supabase";

const personaCookie = "labracadabra-persona";

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function errorResponse(error: unknown) {
  if (error instanceof CampusError) return json({ error: error.message }, error.status);
  console.error("Campus request failed", error instanceof Error ? error.name : "Unknown error");
  return json({ error: "The campus workspace could not complete this request." }, 500);
}

export async function GET(request: NextRequest) {
  try {
    if (mode() === "demo") {
      return json({ workspace: demoWorkspace(demoActor(request.cookies.get(personaCookie)?.value)), personas });
    }
    const session = await getSession(request);
    return writeSession(json({ workspace: await campusSnapshot(session.token), personas: [] }), session.refreshed);
  } catch (error) { return errorResponse(error); }
}

const authSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("signIn"), email: z.email(), password: z.string().min(1).max(1024) }),
  z.object({ type: z.literal("signOut") }),
  z.object({ type: z.literal("persona"), id: z.uuid() }),
]);

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) throw new CampusError("Request origin is not allowed.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new CampusError("Send JSON data.", 415);
    const raw = await request.text();
    if (raw.length > 12_000) throw new CampusError("Request is too large.", 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new CampusError("Invalid request data."); }
    const auth = authSchema.safeParse(body);
    const environment = mode();
    if (auth.success) {
      if (auth.data.type === "persona") {
        if (environment !== "demo") throw new CampusError("Demo personas are disabled.", 403);
        const id = auth.data.id;
        if (!personas.some((person) => person.id === id)) throw new CampusError("Unknown demo persona.");
        const response = json({ id });
        response.cookies.set(personaCookie, id, { httpOnly: true, sameSite: "lax", path: "/" });
        return response;
      }
      if (environment !== "institutional") throw new CampusError("Institutional sign-in is unavailable.", 503);
      if (auth.data.type === "signOut") return await signOut(request, json({}));
      return writeSession(json({}), await signIn(auth.data.email, auth.data.password));
    }
    const parsed = commandSchema.safeParse(body);
    if (!parsed.success) throw new CampusError("Check the submitted fields and try again.");
    if (environment === "demo") return json(demoMutation(demoActor(request.cookies.get(personaCookie)?.value), parsed.data));
    const session = await getSession(request);
    return writeSession(json(await campusMutation(session.token, parsed.data)), session.refreshed);
  } catch (error) { return errorResponse(error); }
}
