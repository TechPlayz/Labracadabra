import type { NextRequest } from "next/server";

export function isSameOrigin(request: NextRequest) {
  const value = request.headers.get("origin");
  if (!value) return false;
  try {
    const origin = new URL(value);
    const host = request.headers.get("host") ?? request.nextUrl.host;
    const forwarded = request.headers.get("x-forwarded-proto");
    const protocol = forwarded === "https" ? "https:" : request.nextUrl.protocol;
    return origin.host === host && origin.protocol === protocol;
  } catch {
    return false;
  }
}
