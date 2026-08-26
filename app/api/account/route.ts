import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { loadProfile, requireProfile } from "@/lib/session";
import { emailForUid, mapFirebaseAuthError, signInWithEmailPassword } from "@/lib/staff-auth";
import {
  classIdsFromAssignments,
  newAssignmentId,
  subjectIdsFromAssignments,
} from "@/lib/teachers";
import { GRADES, SECTIONS } from "@/lib/catalog";
import type { SubjectGrade } from "@/lib/types";

export const runtime = "nodejs";

async function verifyPassword(email: string, password: string) {
  const { ok, payload } = await signInWithEmailPassword(email, password);
  return { ok, message: payload.error?.message };
}

async function usernameTaken(username: string, exceptUid: string) {
  const [users, teachers] = await Promise.all([
    adminDb().collection("users").where("username", "==", username).limit(2).get(),
    adminDb().collection("teachers").where("username", "==", username).limit(2).get(),
  ]);
  return (
    users.docs.some((doc) => doc.id !== exceptUid) ||
    teachers.docs.some((doc) => doc.id !== exceptUid)
  );
}

async function syncTeacherRecord(
  uid: string,
  patch: Record<string, unknown>
) {
  const ref = adminDb().doc(`teachers/${uid}`);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update({ ...patch, updatedAt: new Date().toISOString() });
  } else {
    await ref.set({ id: uid, ...patch, updatedAt: new Date().toISOString() });
  }
  const userRef = adminDb().doc(`users/${uid}`);
  if ((await userRef.get()).exists) {
    await userRef.update(patch);
  }
}

export async function PATCH(request: Request) {
  const user = await requireProfile();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    displayNameAr?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
    newPasswordConfirm?: string;
  };
  const currentPassword = body.currentPassword?.trim();
  if (!currentPassword) {
    return NextResponse.json({ error: "أدخل كلمة المرور الحالية للتأكيد." }, { status: 400 });
  }
  const email = await emailForUid(user.uid, user.email);
  if (!email) {
    return NextResponse.json({ error: "تعذر التحقق من الحساب." }, { status: 401 });
  }
  const verified = await verifyPassword(email, currentPassword);
  if (!verified.ok) {
    const mapped = mapFirebaseAuthError(verified.message);
    return NextResponse.json(
      {
        error:
          mapped === "اسم المستخدم أو كلمة المرور غير صحيحة."
            ? "كلمة المرور الحالية غير صحيحة."
            : mapped,
      },
      { status: 401 }
    );
  }

  const displayNameAr = body.displayNameAr?.trim();
  if (!displayNameAr) {
    return NextResponse.json({ error: "أدخل الاسم الظاهر." }, { status: 400 });
  }
  const username = body.username?.trim();
  if (!username) {
    return NextResponse.json({ error: "أدخل اسم المستخدم." }, { status: 400 });
  }
  if (await usernameTaken(username, user.uid)) {
    return NextResponse.json({ error: "اسم المستخدم مستخدم مسبقاً." }, { status: 400 });
  }

  const newPassword = body.newPassword?.trim();
  const newPasswordConfirm = body.newPasswordConfirm?.trim();
  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف." }, { status: 400 });
    }
    if (newPassword !== newPasswordConfirm) {
      return NextResponse.json({ error: "كلمتا المرور الجديدتان غير متطابقتين." }, { status: 400 });
    }
    await adminAuth().updateUser(user.uid, { password: newPassword });
  }

  const patch: Record<string, unknown> = {
    displayNameAr,
    displayName: displayNameAr,
    name: displayNameAr,
    username,
    role: user.role,
    email: user.email,
  };
  await syncTeacherRecord(user.uid, patch);

  const profile = await loadProfile(user.uid);
  return NextResponse.json({ profile, passwordChanged: Boolean(newPassword) });
}

export async function PUT(request: Request) {
  const user = await requireProfile();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { subjectsGrades?: SubjectGrade[] };
  const grades = new Set(GRADES.map((item) => item.id));
  const sections = new Set(SECTIONS.map((item) => item.id));
  const subjectsGrades = (body.subjectsGrades ?? [])
    .map((row) => ({
      id: row.id || newAssignmentId(),
      gradeId: String(row.gradeId ?? ""),
      sectionId: String(row.sectionId ?? ""),
      subjectId: String(row.subjectId ?? ""),
      subjectNameAr: String(row.subjectNameAr ?? "").trim(),
    }))
    .filter(
      (row) =>
        grades.has(row.gradeId as (typeof GRADES)[number]["id"]) &&
        sections.has(row.sectionId as (typeof SECTIONS)[number]["id"]) &&
        row.subjectId &&
        row.subjectNameAr
    );

  const classIds = classIdsFromAssignments(subjectsGrades);
  const subjectIds = subjectIdsFromAssignments(subjectsGrades);
  await syncTeacherRecord(user.uid, { subjectsGrades, classIds, subjectIds });
  const profile = await loadProfile(user.uid);
  return NextResponse.json({ profile });
}
