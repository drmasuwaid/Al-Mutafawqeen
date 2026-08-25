import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireProfile } from "@/lib/session";
import { compareArabicNames, isPrincipal } from "@/lib/teachers";
import {
  assignmentsForWrite,
  emailForUsername,
  mapTeacherDoc,
  parseTeacherWrite,
  usernameTaken,
  writeTeacherDocs,
} from "@/lib/teacher-records";
import type { TeacherSummary } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const snap = await adminDb().collection("teachers").get();
  const teachers = snap.docs
    .map((doc) => mapTeacherDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((item): item is TeacherSummary => Boolean(item))
    .sort((a, b) => compareArabicNames(a.displayNameAr, b.displayNameAr));
  return NextResponse.json({ teachers });
}

export async function POST(request: Request) {
  const user = await requireProfile();
  if (!user || !isPrincipal(user)) {
    return NextResponse.json({ error: "صلاحية مدير المدرسة مطلوبة." }, { status: 403 });
  }

  const parsed = parseTeacherWrite(await request.json(), { passwordRequired: true });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const input = parsed.value;
  if (await usernameTaken(input.username)) {
    return NextResponse.json({ error: "اسم المستخدم مستخدم مسبقاً." }, { status: 400 });
  }

  try {
    const assignments = await assignmentsForWrite(input);
    if (!input.password) {
      return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن 6 أحرف." }, { status: 400 });
    }
    const email = emailForUsername(input.username);
    const now = new Date().toISOString();
    const created = await adminAuth().createUser({
      email,
      password: input.password,
      displayName: input.displayNameAr,
      emailVerified: true,
    });
    const teacher = await writeTeacherDocs(created.uid, input, assignments, email, now);
    return NextResponse.json({ teacher });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حفظ المدرس" },
      { status: 400 }
    );
  }
}
