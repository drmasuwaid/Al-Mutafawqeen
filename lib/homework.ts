import type {
  Completion,
  Homework,
  HomeworkStatus,
  LiveSnapshot,
  Profile,
  SchoolClass,
  Subject,
} from "@/lib/types";
import { adminDb } from "@/lib/firebase-admin";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

function asIso(value: unknown, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return fallback;
}

function mapHomework(
  doc: QueryDocumentSnapshot<DocumentData>,
  completions: Completion[]
): Homework {
  const data = doc.data();
  return {
    id: doc.id,
    title: String(data.title ?? ""),
    titleAr: String(data.titleAr ?? ""),
    details: String(data.details ?? ""),
    detailsAr: String(data.detailsAr ?? ""),
    subjectId: String(data.subjectId ?? ""),
    classId: String(data.classId ?? ""),
    teacherId: String(data.teacherId ?? ""),
    teacherName: String(data.teacherName ?? ""),
    teacherNameAr: String(data.teacherNameAr ?? ""),
    dueAt: asIso(data.dueAt),
    status: (data.status as HomeworkStatus) ?? "published",
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    completions,
  };
}

function homeworkVisible(user: Profile, item: { classId: string; teacherId: string; status: string }) {
  if (user.role === "admin") return true;
  if (item.status !== "published" && user.uid !== item.teacherId) return false;
  if (user.role === "teacher") {
    if (item.teacherId === user.uid) return true;
    return Boolean(user.classIds?.includes(item.classId));
  }
  return user.classId === item.classId && item.status === "published";
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
      color: String(data.color ?? "#0f766e"),
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

export async function loadLiveSnapshot(user: Profile): Promise<LiveSnapshot> {
  const [homeworkSnap, classes, subjects, students] = await Promise.all([
    adminDb().collection("homework").orderBy("dueAt", "asc").get(),
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
          teacherId: String(data.teacherId ?? ""),
          status: String(data.status ?? "published"),
        };
        if (!homeworkVisible(user, preview)) return null;
        const completions = await loadCompletions(doc.id);
        return mapHomework(doc, completions);
      })
    )
  ).filter((item): item is Homework => item !== null);

  return {
    homework,
    classes,
    subjects,
    students,
    serverTime: new Date().toISOString(),
  };
}

export function subscribeLiveSnapshot(
  user: Profile,
  handlers: {
    onData: (snapshot: LiveSnapshot) => void;
    onError: (error: Error) => void;
  }
) {
  const db = adminDb();
  return db.collection("homework").onSnapshot(
    async () => {
      try {
        handlers.onData(await loadLiveSnapshot(user));
      } catch (error) {
        handlers.onError(
          error instanceof Error ? error : new Error("Live sync failed")
        );
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
  dueAt: string;
  status?: HomeworkStatus;
};

export async function createHomework(user: Profile, input: HomeworkInput) {
  if (user.role === "student") {
    throw new Error("Students cannot assign homework.");
  }
  if (
    user.role === "teacher" &&
    user.classIds &&
    !user.classIds.includes(input.classId)
  ) {
    throw new Error("You can only assign homework to your own classes.");
  }

  const now = new Date().toISOString();
  const ref = dbHomework().doc();
  await ref.set({
    ...input,
    status: input.status ?? "published",
    teacherId: user.uid,
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
  if (user.role !== "admin" && current.teacherId !== user.uid) {
    throw new Error("You can only edit homework you assigned.");
  }
  await ref.update({ ...input, updatedAt: new Date().toISOString() });
}

export async function deleteHomework(user: Profile, id: string) {
  const ref = dbHomework().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Homework not found.");
  const current = snap.data() ?? {};
  if (user.role !== "admin" && current.teacherId !== user.uid) {
    throw new Error("You can only delete homework you assigned.");
  }
  const completions = await ref.collection("completions").get();
  const batch = adminDb().batch();
  completions.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(ref);
  await batch.commit();
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
  if (data.classId !== user.classId) {
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
