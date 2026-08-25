import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireProfile } from "@/lib/session";
import { GRADES, SECTIONS } from "@/lib/catalog";
import {
  assignmentsFromSelections,
  classIdsFromAssignments,
  compareArabicNames,
  isPrincipal,
  subjectIdsFromAssignments,
} from "@/lib/teachers";
import type { Subject, TeacherSummary } from "@/lib/types";

export const runtime = "nodejs";

function mapTeacherDoc(id: string, data: Record<string, unknown>): TeacherSummary | null {
  const role = String(data.role ?? "teacher");
  if (role !== "teacher") return null;
  const subjectsGrades = Array.isArray(data.subjectsGrades) ? data.subjectsGrades : [];
  return {
    id,
    displayNameAr: String(data.name || data.displayNameAr || data.username || id),
    username: String(data.username ?? ""),
    subjectsGrades: subjectsGrades.map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      gradeId: String(row.gradeId ?? ""),
      sectionId: String(row.sectionId ?? ""),
      subjectId: String(row.subjectId ?? ""),
      subjectNameAr: String(row.subjectNameAr ?? ""),
    })),
  };
}

export async function GET() {
  const snap = await adminDb().collection("teachers").get();
  const teachers = snap.docs
    .map((doc) => mapTeacherDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((item): item is TeacherSummary => Boolean(item))
    .sort((a, b) => compareArabicNames(a.displayNameAr, b.displayNameAr));
  return NextResponse.json({ teachers });
}

async function usernameTaken(username: string) {
  const [users, teachers] = await Promise.all([
    adminDb().collection("users").where("username", "==", username).limit(1).get(),
    adminDb().collection("teachers").where("username", "==", username).limit(1).get(),
  ]);
  return !users.empty || !teachers.empty;
}

function emailForUsername(username: string) {
  const local = username.toLowerCase().replace(/[^a-z0-9._-]+/g, "") || `t${Date.now().toString(36)}`;
  return `${local}@mutafawqeen.school`;
}

export async function POST(request: Request) {
  const user = await requireProfile();
  if (!user || !isPrincipal(user)) {
    return NextResponse.json({ error: "صلاحية مدير المدرسة مطلوبة." }, { status: 403 });
  }

  const body = (await request.json()) as {
    displayNameAr?: string;
    username?: string;
    password?: string;
    gradeIds?: string[];
    sectionIds?: string[];
    subjectIds?: string[];
  };

  const displayNameAr = body.displayNameAr?.trim();
  const username = body.username?.trim();
  const password = body.password?.trim();
  const gradeIds = [...new Set((body.gradeIds ?? []).map(String).filter(Boolean))];
  const sectionIds = [...new Set((body.sectionIds ?? []).map(String).filter(Boolean))];
  const subjectIds = [...new Set((body.subjectIds ?? []).map(String).filter(Boolean))];

  if (!displayNameAr) {
    return NextResponse.json({ error: "أدخل الاسم الكامل للمدرس." }, { status: 400 });
  }
  if (!username || username.length < 3) {
    return NextResponse.json({ error: "اسم المستخدم يجب ألا يقل عن 3 أحرف." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن 6 أحرف." }, { status: 400 });
  }
  if (!gradeIds.length || !sectionIds.length || !subjectIds.length) {
    return NextResponse.json({ error: "أضف مرحلة وشعبة ومادة واحدة على الأقل." }, { status: 400 });
  }

  const gradeSet = new Set(GRADES.map((item) => item.id));
  const sectionSet = new Set(SECTIONS.map((item) => item.id));
  if (gradeIds.some((id) => !gradeSet.has(id as (typeof GRADES)[number]["id"]))) {
    return NextResponse.json({ error: "مرحلة غير صالحة." }, { status: 400 });
  }
  if (sectionIds.some((id) => !sectionSet.has(id as (typeof SECTIONS)[number]["id"]))) {
    return NextResponse.json({ error: "شعبة غير صالحة." }, { status: 400 });
  }
  if (await usernameTaken(username)) {
    return NextResponse.json({ error: "اسم المستخدم مستخدم مسبقاً." }, { status: 400 });
  }

  const subjectSnap = await adminDb().collection("subjects").get();
  const catalog: Subject[] = subjectSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name ?? data.nameAr ?? doc.id),
      nameAr: String(data.nameAr ?? data.name ?? doc.id),
      color: String(data.color ?? "#2563eb"),
    };
  });
  const selectedSubjects = subjectIds
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is Subject => Boolean(item));
  if (selectedSubjects.length !== subjectIds.length) {
    return NextResponse.json({ error: "مادة غير صالحة." }, { status: 400 });
  }

  const subjectsGrades = assignmentsFromSelections(gradeIds, sectionIds, selectedSubjects);
  const classIds = classIdsFromAssignments(subjectsGrades);
  const teacherSubjectIds = subjectIdsFromAssignments(subjectsGrades);
  const email = emailForUsername(username);
  const now = new Date().toISOString();

  const created = await adminAuth().createUser({
    email,
    password,
    displayName: displayNameAr,
    emailVerified: true,
  });
  const uid = created.uid;

  await adminDb().doc(`users/${uid}`).set({
    email,
    username,
    displayName: displayNameAr,
    displayNameAr,
    role: "teacher",
    classIds,
    subjectIds: teacherSubjectIds,
  });
  await adminDb().doc(`teachers/${uid}`).set({
    id: uid,
    name: displayNameAr,
    nameEn: displayNameAr,
    username,
    email,
    role: "teacher",
    subjectsGrades,
    classIds,
    subjectIds: teacherSubjectIds,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    teacher: {
      id: uid,
      displayNameAr,
      username,
      subjectsGrades,
    } satisfies TeacherSummary,
  });
}
