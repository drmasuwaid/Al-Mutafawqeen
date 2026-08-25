import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { deleteHomeworkByTeacher } from "@/lib/homework";
import { requireProfile } from "@/lib/session";
import { isPrincipal } from "@/lib/teachers";
import {
  assignmentsForWrite,
  emailForUsername,
  mapTeacherDoc,
  parseTeacherWrite,
  updateAuthAccount,
  usernameTaken,
  writeTeacherDocs,
} from "@/lib/teacher-records";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function requirePrincipal() {
  const user = await requireProfile();
  if (!user || !isPrincipal(user)) {
    return { error: NextResponse.json({ error: "صلاحية مدير المدرسة مطلوبة." }, { status: 403 }) };
  }
  return { user };
}

async function loadTeacher(id: string) {
  const snap = await adminDb().doc(`teachers/${id}`).get();
  if (!snap.exists) return null;
  return mapTeacherDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requirePrincipal();
  if (auth.error) return auth.error;
  const { id } = await params;
  const existing = await loadTeacher(id);
  if (!existing) {
    return NextResponse.json({ error: "المدرس غير موجود." }, { status: 404 });
  }

  const parsed = parseTeacherWrite(await request.json(), { passwordRequired: false });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const input = parsed.value;
  if (await usernameTaken(input.username, id)) {
    return NextResponse.json({ error: "اسم المستخدم مستخدم مسبقاً." }, { status: 400 });
  }

  try {
    const teacherSnap = await adminDb().doc(`teachers/${id}`).get();
    let currentEmail = String(teacherSnap.data()?.email ?? "");
    if (!currentEmail) {
      try {
        currentEmail = (await adminAuth().getUser(id)).email || emailForUsername(input.username);
      } catch {
        currentEmail = emailForUsername(input.username);
      }
    }
    const assignments = await assignmentsForWrite(input);
    await updateAuthAccount(id, input);
    const teacher = await writeTeacherDocs(id, input, assignments, currentEmail);
    return NextResponse.json({ teacher });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تعديل المدرس" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePrincipal();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (id === auth.user.uid) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك من هنا." }, { status: 400 });
  }
  const existing = await loadTeacher(id);
  if (!existing) {
    return NextResponse.json({ error: "المدرس غير موجود." }, { status: 404 });
  }

  try {
    await deleteHomeworkByTeacher(id);
    await adminDb().doc(`teachers/${id}`).delete();
    await adminDb().doc(`users/${id}`).delete();
    try {
      await adminAuth().deleteUser(id);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "auth/user-not-found") throw error;
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حذف المدرس" },
      { status: 400 }
    );
  }
}
