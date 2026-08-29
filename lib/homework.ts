import type {
  Attachment,
  Completion,
  Homework,
  HomeworkStatus,
  LiveSnapshot,
  Profile,
  SchoolClass,
  Subject,
} from "@/lib/types";
import { adminDb } from "@/lib/firebase-admin";
import { deleteHomeworkFiles } from "@/lib/files";
import { isHomeworkOwner, sessionTeacherId, teacherCanPublishAssignment, teacherClassIds } from "@/lib/teachers";
import type { DocumentData, DocumentReference, QueryDocumentSnapshot } from "firebase-admin/firestore";

export const HOMEWORK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function asIso(value: unknown, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return fallback;
}

function asIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  return asIso(value);
}

function mapAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      name: String(row.name ?? "ملف"),
      type: String(row.type ?? "application/octet-stream"),
      size: Number(row.size ?? 0),
      storagePath: row.storagePath ? String(row.storagePath) : undefined,
      dataUrl: row.dataUrl ? String(row.dataUrl) : undefined,
    };
  });
}

export function homeworkClassIds(item: { classId?: string; classIds?: string[] }) {
  if (item.classIds?.length) return item.classIds;
  return item.classId ? [item.classId] : [];
}

function mapHomework(
  doc: QueryDocumentSnapshot<DocumentData>,
  completions: Completion[]
): Homework {
  const data = doc.data();
  const classId = String(data.classId ?? "");
  const classIds = Array.isArray(data.classIds)
    ? data.classIds.map(String)
    : classId
      ? [classId]
      : [];
  const createdBy = String(data.createdBy ?? "");
  const teacherId = String(data.teacherId ?? createdBy);
  return {
    id: doc.id,
    title: String(data.title ?? ""),
    titleAr: String(data.titleAr ?? data.title ?? ""),
    details: String(data.details ?? ""),
    detailsAr: String(data.detailsAr ?? data.details ?? ""),
    subjectId: String(data.subjectId ?? ""),
    classId: classId || classIds[0] || "",
    classIds,
    createdBy,
    teacherId,
    teacherName: String(data.teacherName ?? ""),
    teacherNameAr: String(data.createdByNameAr ?? data.teacherNameAr ?? ""),
    dueAt: asIsoOrNull(data.dueAt),
    status: (data.status as HomeworkStatus) ?? "published",
    createdAt: asIso(data.createdAt || data.updatedAt),
    updatedAt: asIso(data.updatedAt),
    attachments: mapAttachments(data.attachments),
    completions,
  };
}

function homeworkVisible(
  user: Profile,
  item: { classId: string; classIds?: string[]; teacherId: string; createdBy?: string; status: string }
) {
  const owner = item.createdBy || item.teacherId;
  if (user.role === "admin") return true;
  if (item.status !== "published" && user.uid !== owner) return false;
  if (user.role === "teacher") return item.status === "published" || user.uid === owner;
  const ids = homeworkClassIds(item);
  return Boolean(user.classId && ids.includes(user.classId) && item.status === "published");
}

async function loadCompletions(homeworkId: string): Promise<Completion[]> {
  const snap = await adminDb()
    .collection("homework")
    .doc(homeworkId)
    .collection("completions")
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      studentId: doc.id,
      studentName: String(data.studentName ?? ""),
      studentNameAr: String(data.studentNameAr ?? ""),
      status: data.status === "done" ? "done" : "pending",
      completedAt: data.completedAt ? asIso(data.completedAt) : null,
      note: String(data.note ?? ""),
    };
  });
}

export async function listClasses(): Promise<SchoolClass[]> {
  const snap = await adminDb().collection("classes").orderBy("grade").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name ?? ""),
      nameAr: String(data.nameAr ?? ""),
      grade: Number(data.grade ?? 0),
      section: String(data.section ?? ""),
    };
  });
}

export async function listSubjects(): Promise<Subject[]> {
  const snap = await adminDb().collection("subjects").orderBy("name").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name ?? ""),
      nameAr: String(data.nameAr ?? ""),
      color: String(data.color ?? "#2563eb"),
    };
  });
}

export async function listStudents(): Promise<Profile[]> {
  const snap = await adminDb()
    .collection("users")
    .where("role", "==", "student")
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: String(data.email ?? ""),
      displayName: String(data.displayName ?? ""),
      displayNameAr: String(data.displayNameAr ?? ""),
      role: "student",
      classId: data.classId ? String(data.classId) : undefined,
    };
  });
}

export async function purgeExpiredHomework() {
  const cutoff = Date.now() - HOMEWORK_TTL_MS;
  const snap = await adminDb().collection("homework").get();
  for (const doc of snap.docs) {
    const createdAt = Date.parse(asIso(doc.data().createdAt));
    if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;
    await deleteHomeworkFiles(mapAttachments(doc.data().attachments));
    const completions = await doc.ref.collection("completions").get();
    const batch = adminDb().batch();
    completions.docs.forEach((row) => batch.delete(row.ref));
    batch.delete(doc.ref);
    await batch.commit();
  }
}

export async function loadLiveSnapshot(user: Profile): Promise<LiveSnapshot> {
  await purgeExpiredHomework();
  const [homeworkSnap, classes, subjects, students] = await Promise.all([
    adminDb().collection("homework").get(),
    listClasses(),
    listSubjects(),
    user.role === "student" ? Promise.resolve([]) : listStudents(),
  ]);

  const homework = (
    await Promise.all(
      homeworkSnap.docs.map(async (doc) => {
        const data = doc.data();
        const preview = {
          classId: String(data.classId ?? ""),
          classIds: Array.isArray(data.classIds) ? data.classIds.map(String) : undefined,
          teacherId: String(data.teacherId ?? ""),
          createdBy: data.createdBy ? String(data.createdBy) : undefined,
          status: String(data.status ?? "published"),
        };
        if (!homeworkVisible(user, preview)) return null;
        const completions = await loadCompletions(doc.id);
        return mapHomework(doc, completions);
      })
    )
  )
    .filter((item): item is Homework => item !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    homework,
    classes,
    subjects,
    students,
    serverTime: new Date().toISOString(),
  };
}

export type LiveChangeKind = "added" | "modified" | "removed";

export function subscribeLiveSnapshot(
  user: Profile,
  handlers: {
    onData: (snapshot: LiveSnapshot, meta?: { kinds: LiveChangeKind[] }) => void;
    onError: (error: Error) => void;
  }
) {
  const db = adminDb();
  let seq = 0;
  return db.collection("homework").onSnapshot(
    async (snapshot) => {
      const kinds = [
        ...new Set(snapshot.docChanges().map((change) => change.type)),
      ];
      const my = ++seq;
      try {
        const data = await loadLiveSnapshot(user);
        if (my !== seq) return;
        handlers.onData(data, { kinds });
      } catch (error) {
        if (my !== seq) return;
        handlers.onError(error instanceof Error ? error : new Error("Live sync failed"));
      }
    },
    (error) => handlers.onError(error)
  );
}

export type HomeworkInput = {
  title: string;
  titleAr: string;
  details: string;
  detailsAr: string;
  subjectId: string;
  classId: string;
  classIds: string[];
  dueAt?: string | null;
  status?: HomeworkStatus;
  attachments?: Attachment[];
};

function assertTeacherCanUseClasses(user: Profile, classIds: string[], subjectId?: string) {
  if (user.role === "admin") return;
  if (!classIds.length) throw new Error("اختر شعبة واحدة على الأقل.");
  const allowed = teacherClassIds(user);
  if (!allowed.length) {
    throw new Error("لم تُسند إليك شعب بعد. راجع مدير المدرسة.");
  }
  if (classIds.some((id) => !allowed.includes(id))) {
    throw new Error("يمكنك النشر للشعب المسندة إليك فقط.");
  }
  if (subjectId && !teacherCanPublishAssignment(user, classIds, subjectId)) {
    throw new Error("يمكنك النشر للمادة والشعب المسندة إليك فقط.");
  }
}

export async function createHomework(user: Profile, input: HomeworkInput) {
  if (user.role === "student") {
    throw new Error("Students cannot assign homework.");
  }
  assertTeacherCanUseClasses(user, input.classIds, input.subjectId);

  const teacherId = sessionTeacherId(user);
  const now = new Date().toISOString();
  const ref = dbHomework().doc();
  await ref.set({
    title: input.title,
    titleAr: input.titleAr,
    details: input.details,
    detailsAr: input.detailsAr,
    subjectId: input.subjectId,
    classId: input.classId,
    classIds: input.classIds,
    dueAt: input.dueAt ?? null,
    attachments: input.attachments ?? [],
    status: input.status ?? "published",
    createdBy: teacherId,
    createdByNameAr: user.displayNameAr,
    teacherId,
    teacherName: user.displayName,
    teacherNameAr: user.displayNameAr,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateHomework(
  user: Profile,
  id: string,
  input: Partial<HomeworkInput>
) {
  const ref = dbHomework().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Homework not found.");
  const current = snap.data() ?? {};
  if (!isHomeworkOwner(user, { createdBy: String(current.createdBy ?? ""), teacherId: String(current.teacherId ?? "") })) {
    throw new Error("يمكنك تعديل واجباتك فقط.");
  }
  if (input.classIds || input.subjectId) {
    const classIds = input.classIds ?? (Array.isArray(current.classIds) ? current.classIds.map(String) : []);
    const subjectId = input.subjectId ?? String(current.subjectId ?? "");
    assertTeacherCanUseClasses(user, classIds, subjectId);
  }
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) patch[key] = value;
  }
  await ref.update(patch);
}

async function purgeHomeworkDoc(ref: DocumentReference) {
  const snap = await ref.get();
  if (!snap.exists) return;
  const current = snap.data() ?? {};
  await deleteHomeworkFiles(mapAttachments(current.attachments));
  const completions = await ref.collection("completions").get();
  const batch = adminDb().batch();
  completions.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(ref);
  await batch.commit();
}

export async function deleteHomework(user: Profile, id: string) {
  const ref = dbHomework().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Homework not found.");
  const current = snap.data() ?? {};
  if (!isHomeworkOwner(user, { createdBy: String(current.createdBy ?? ""), teacherId: String(current.teacherId ?? "") })) {
    throw new Error("يمكنك حذف واجباتك فقط.");
  }
  await purgeHomeworkDoc(ref);
}

export async function deleteHomeworkByTeacher(teacherId: string) {
  const [createdSnap, teacherSnap] = await Promise.all([
    dbHomework().where("createdBy", "==", teacherId).get(),
    dbHomework().where("teacherId", "==", teacherId).get(),
  ]);
  const refs = new Map<string, DocumentReference>();
  for (const doc of [...createdSnap.docs, ...teacherSnap.docs]) {
    refs.set(doc.id, doc.ref);
  }
  for (const ref of refs.values()) {
    await purgeHomeworkDoc(ref);
  }
}

export async function setCompletion(
  user: Profile,
  homeworkId: string,
  done: boolean,
  note = ""
) {
  if (user.role !== "student") {
    throw new Error("Only students mark homework as done.");
  }
  const homework = await dbHomework().doc(homeworkId).get();
  if (!homework.exists) throw new Error("Homework not found.");
  const data = homework.data() ?? {};
  const ids = homeworkClassIds({
    classId: String(data.classId ?? ""),
    classIds: Array.isArray(data.classIds) ? data.classIds.map(String) : undefined,
  });
  if (!user.classId || !ids.includes(user.classId)) {
    throw new Error("This homework is not assigned to your class.");
  }
  const now = new Date().toISOString();
  const homeworkRef = dbHomework().doc(homeworkId);
  const batch = adminDb().batch();
  batch.set(homeworkRef.collection("completions").doc(user.uid), {
    studentName: user.displayName,
    studentNameAr: user.displayNameAr,
    status: done ? "done" : "pending",
    completedAt: done ? now : null,
    note,
  });
  batch.update(homeworkRef, { updatedAt: now });
  await batch.commit();
}

function dbHomework() {
  return adminDb().collection("homework");
}
