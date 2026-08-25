import { NextResponse } from "next/server";
import { authSignInUrl } from "@/lib/firebase-admin";
import {
  findUserByUsername,
  loadProfile,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";

type AuthResponse = {
  localId?: string;
  email?: string;
  error?: { message?: string };
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };
  const identifier = (body.username || body.email || "").trim();
  const password = body.password;
  if (!identifier || !password) {
    return NextResponse.json({ error: "أدخل اسم المستخدم وكلمة المرور." }, { status: 400 });
  }

  let email = identifier;
  if (!identifier.includes("@")) {
    const matched = await findUserByUsername(identifier);
    if (!matched?.email) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }
    email = matched.email;
  }

  const authRes = await fetch(authSignInUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const payload = (await authRes.json()) as AuthResponse;
  if (!authRes.ok || !payload.localId || !payload.email) {
    return NextResponse.json(
      { error: "اسم المستخدم أو كلمة المرور غير صحيحة." },
      { status: 401 }
    );
  }

  const profile = await loadProfile(payload.localId);
  if (!profile || profile.role === "student") {
    return NextResponse.json(
      { error: "هذا الحساب غير مخوّل لواجهة الكادر التدريسي." },
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
