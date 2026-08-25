import { NextResponse } from "next/server";
import { authSignInUrl } from "@/lib/firebase-admin";
import { loadProfile, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

type AuthResponse = {
  localId?: string;
  email?: string;
  error?: { message?: string };
};

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const authRes = await fetch(authSignInUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const payload = (await authRes.json()) as AuthResponse;
  if (!authRes.ok || !payload.localId || !payload.email) {
    return NextResponse.json(
      { error: payload.error?.message || "Invalid email or password" },
      { status: 401 }
    );
  }

  const profile = await loadProfile(payload.localId);
  if (!profile) {
    return NextResponse.json(
      { error: "This account has no school profile." },
      { status: 403 }
    );
  }

  const token = await createSessionToken({
    uid: profile.uid,
    email: profile.email,
    role: profile.role,
  });
  const response = NextResponse.json({ profile });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
