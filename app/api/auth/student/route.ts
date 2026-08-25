import { NextResponse } from "next/server";
import { GRADES, SECTIONS, classIdFor } from "@/lib/catalog";
import {
  createSessionToken,
  guestProfile,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { gradeId?: string; sectionId?: string };
  const gradeId = body.gradeId?.trim();
  const sectionId = body.sectionId?.trim();
  const grade = GRADES.find((item) => item.id === gradeId);
  const section = SECTIONS.find((item) => item.id === sectionId);
  if (!grade || !section) {
    return NextResponse.json(
      { error: "يرجى اختيار الصف والشعبة." },
      { status: 400 }
    );
  }

  const classId = classIdFor(grade.id, section.id);
  const profile = guestProfile(classId);
  const token = await createSessionToken({
    uid: profile.uid,
    email: profile.email,
    role: "student",
    classId,
  });
  const response = NextResponse.json({ profile });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
