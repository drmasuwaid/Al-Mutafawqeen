import { NextResponse } from "next/server";
import {
  createSessionToken,
  loadProfile,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import {
  mapFirebaseAuthError,
  resolveStaffEmail,
  signInWithEmailPassword,
} from "@/lib/staff-auth";
import { sessionTeacherId } from "@/lib/teachers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
    role?: "admin" | "teacher";
    teacherId?: string;
  };
  const identifier = (body.username || body.email || "").trim();
  const password = (body.password || "").trim();
  if (!identifier || !password) {
    return NextResponse.json({ error: "أدخل اسم المستخدم وكلمة المرور." }, { status: 400 });
  }

  const resolved = await resolveStaffEmail(identifier);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { ok, payload } = await signInWithEmailPassword(resolved.email, password);
  if (!ok || !payload.localId || !payload.email) {
    return NextResponse.json(
      { error: mapFirebaseAuthError(payload.error?.message) },
      { status: 401 }
    );
  }

  const profile = await loadProfile(payload.localId);
  if (!profile || profile.role === "student") {
    return NextResponse.json(
      { error: "هذا الحساب غير مخوّل لواجهة الكادر الإداري والتدريسي." },
      { status: 403 }
    );
  }

  const expectedRole = body.role === "admin" || body.role === "teacher" ? body.role : undefined;
  const selectedTeacherId = String(body.teacherId || "").trim();
  if (expectedRole === "admin" && profile.role !== "admin") {
    return NextResponse.json(
      { error: "هذا الحساب ليس لمدير المدرسة. استخدم بوابة المدرس." },
      { status: 403 }
    );
  }
  if (expectedRole === "teacher") {
    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "هذا الحساب ليس لمدرس. استخدم بوابة مدير المدرسة." },
        { status: 403 }
      );
    }
    if (
      selectedTeacherId &&
      selectedTeacherId !== profile.uid &&
      selectedTeacherId !== sessionTeacherId(profile)
    ) {
      return NextResponse.json(
        { error: "اسم المستخدم لا يطابق المدرس المختار من القائمة." },
        { status: 403 }
      );
    }
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
