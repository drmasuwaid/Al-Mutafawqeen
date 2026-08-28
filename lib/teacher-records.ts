import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { GRADES, SECTIONS } from "@/lib/catalog";
import {
  assignmentsFromGradeSections,
  classIdsFromAssignments,
  subjectIdsFromAssignments,
  type GradeSectionSelection,
} from "@/lib/teachers";
import type { Subject, TeacherSummary } from "@/lib/types";

export function mapTeacherDoc(id: string, data: Record<string, unknown>): TeacherSummary | null {
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

export async function usernameTaken(username: string, exceptUid?: string) {
  const [users, teachers] = await Promise.all([
    adminDb().collection("users").where("username", "==", username).limit(2).get(),
    adminDb().collection("teachers").where("username", "==", username).limit(2).get(),
  ]);
  return (
    users.docs.some((doc) => doc.id !== exceptUid) ||
    teachers.docs.some((doc) => doc.id !== exceptUid)
  );
}

export function emailForUsername(username: string) {
  const local = username.toLowerCase().replace(/[^a-z0-9._-]+/g, "") || `t${Date.now().toString(36)}`;
  return `${local}@mutafawqeen.school`;
}

export type TeacherWriteInput = {
  displayNameAr: string;
  username: string;
  password?: string;
  gradeSections: GradeSectionSelection[];
};

function uniqueIds(values: unknown) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

export function parseTeacherWrite(
  body: {
    displayNameAr?: string;
    username?: string;
    password?: string;
    gradeIds?: string[];
    sectionIds?: string[];
    subjectIds?: string[];
    gradeSections?: { gradeId?: string; sectionIds?: string[]; subjectIds?: string[] }[];
  },
  options: { passwordRequired: boolean }
): { ok: true; value: TeacherWriteInput } | { ok: false; error: string; status: number } {
  const displayNameAr = body.displayNameAr?.trim();
  const username = body.username?.trim();
  const password = body.password?.trim();
  const globalSubjectIds = uniqueIds(body.subjectIds);
  const legacyGradeIds = uniqueIds(body.gradeIds);
  const legacySectionIds = uniqueIds(body.sectionIds);

  const rawGradeSections = Array.isArray(body.gradeSections) ? body.gradeSections : [];
  let gradeSections: GradeSectionSelection[] = rawGradeSections
    .map((row) => ({
      gradeId: String(row.gradeId ?? "").trim(),
      sectionIds: uniqueIds(row.sectionIds),
      subjectIds: uniqueIds(row.subjectIds),
    }))
    .filter((row) => row.gradeId);

  if (!gradeSections.length && legacyGradeIds.length && legacySectionIds.length) {
    gradeSections = legacyGradeIds.map((gradeId) => ({
      gradeId,
      sectionIds: legacySectionIds,
      subjectIds: globalSubjectIds,
    }));
  } else {
    gradeSections = gradeSections.map((row) => ({
      ...row,
      subjectIds: row.subjectIds.length ? row.subjectIds : globalSubjectIds,
    }));
  }

  if (!displayNameAr) {
    return { ok: false, error: "أدخل الاسم الكامل للمدرس.", status: 400 };
  }
  if (!username || username.length < 3) {
    return { ok: false, error: "اسم المستخدم يجب ألا يقل عن 3 أحرف.", status: 400 };
  }
  if (options.passwordRequired && (!password || password.length < 6)) {
    return { ok: false, error: "كلمة المرور يجب ألا تقل عن 6 أحرف.", status: 400 };
  }
  if (password && password.length < 6) {
    return { ok: false, error: "كلمة المرور يجب ألا تقل عن 6 أحرف.", status: 400 };
  }
  if (!gradeSections.length) {
    return { ok: false, error: "أضف مرحلة وشعبة ومادة واحدة على الأقل.", status: 400 };
  }
  const gradeIds = gradeSections.map((row) => row.gradeId);
  if (new Set(gradeIds).size !== gradeIds.length) {
    return { ok: false, error: "لا يمكن تكرار المرحلة.", status: 400 };
  }
  if (gradeSections.some((row) => !row.sectionIds.length)) {
    return { ok: false, error: "أضف شعبة واحدة على الأقل لكل مرحلة.", status: 400 };
  }
  if (gradeSections.some((row) => !row.subjectIds.length)) {
    return { ok: false, error: "أضف مادة واحدة على الأقل لكل مرحلة.", status: 400 };
  }

  const gradeSet = new Set(GRADES.map((item) => item.id));
  const sectionSet = new Set(SECTIONS.map((item) => item.id));
  if (gradeSections.some((row) => !gradeSet.has(row.gradeId as (typeof GRADES)[number]["id"]))) {
    return { ok: false, error: "مرحلة غير صالحة.", status: 400 };
  }
  if (gradeSections.some((row) => row.sectionIds.some((id) => !sectionSet.has(id as (typeof SECTIONS)[number]["id"])))) {
    return { ok: false, error: "شعبة غير صالحة.", status: 400 };
  }

  return {
    ok: true,
    value: {
      displayNameAr,
      username,
      password: password || undefined,
      gradeSections,
    },
  };
}

export async function loadSubjectCatalog(): Promise<Subject[]> {
  const subjectSnap = await adminDb().collection("subjects").get();
  return subjectSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name ?? data.nameAr ?? doc.id),
      nameAr: String(data.nameAr ?? data.name ?? doc.id),
      color: String(data.color ?? "#2563eb"),
    };
  });
}

export async function assignmentsForWrite(input: TeacherWriteInput) {
  const catalog = await loadSubjectCatalog();
  const requestedIds = [...new Set(input.gradeSections.flatMap((row) => row.subjectIds))];
  const selectedSubjects = requestedIds
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is Subject => Boolean(item));
  if (selectedSubjects.length !== requestedIds.length) {
    throw new Error("مادة غير صالحة.");
  }
  const subjectsGrades = assignmentsFromGradeSections(input.gradeSections, selectedSubjects);
  return {
    subjectsGrades,
    classIds: classIdsFromAssignments(subjectsGrades),
    subjectIds: subjectIdsFromAssignments(subjectsGrades),
  };
}

export async function writeTeacherDocs(
  uid: string,
  input: TeacherWriteInput,
  assignments: Awaited<ReturnType<typeof assignmentsForWrite>>,
  email: string,
  createdAt?: string
) {
  const now = new Date().toISOString();
  await adminDb().doc(`users/${uid}`).set(
    {
      email,
      username: input.username,
      displayName: input.displayNameAr,
      displayNameAr: input.displayNameAr,
      role: "teacher",
      classIds: assignments.classIds,
      subjectIds: assignments.subjectIds,
    },
    { merge: true }
  );
  await adminDb().doc(`teachers/${uid}`).set(
    {
      id: uid,
      name: input.displayNameAr,
      nameEn: input.displayNameAr,
      username: input.username,
      email,
      role: "teacher",
      subjectsGrades: assignments.subjectsGrades,
      classIds: assignments.classIds,
      subjectIds: assignments.subjectIds,
      ...(createdAt ? { createdAt } : {}),
      updatedAt: now,
    },
    { merge: true }
  );
  return {
    id: uid,
    displayNameAr: input.displayNameAr,
    username: input.username,
    subjectsGrades: assignments.subjectsGrades,
  } satisfies TeacherSummary;
}

export async function updateAuthAccount(
  uid: string,
  input: Pick<TeacherWriteInput, "displayNameAr" | "password">
) {
  await adminAuth().updateUser(uid, {
    displayName: input.displayNameAr,
    ...(input.password ? { password: input.password } : {}),
  });
}
