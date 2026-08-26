import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { usernamesMatch } from "@/lib/arabic";
import { adminDb } from "@/lib/firebase-admin";
import { classById } from "@/lib/catalog";
import { classIdsFromAssignments, subjectIdsFromAssignments } from "@/lib/teachers";
import type { Profile, Role, SubjectGrade } from "@/lib/types";

export const SESSION_COOKIE = "stf_session";

export type SessionPayload = {
  uid: string;
  email: string;
  role: Role;
  classId?: string;
};

function secret() {
  const value =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "dev-only-school-task-flow-secret");
  if (!value) {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.uid !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "admin" &&
        payload.role !== "teacher" &&
        payload.role !== "student")
    ) {
      return null;
    }
    return {
      uid: payload.uid,
      email: payload.email,
      role: payload.role,
      classId: typeof payload.classId === "string" ? payload.classId : undefined,
    };
  } catch {
    return null;
  }
}

export function guestProfile(classId: string): Profile {
  const cls = classById(classId);
  return {
    uid: `guest-${classId}`,
    email: `guest-${classId}@student.local`,
    displayName: cls?.name ?? "Student",
    displayNameAr: cls
      ? `طالب · ${cls.gradeLabelAr} · ${cls.sectionLabelAr}`
      : "طالب",
    role: "student",
    classId,
  };
}

function mapSubjectGrades(value: unknown): SubjectGrade[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      gradeId: String(row.gradeId ?? ""),
      sectionId: String(row.sectionId ?? ""),
      subjectId: String(row.subjectId ?? ""),
      subjectNameAr: String(row.subjectNameAr ?? ""),
    };
  });
}

export async function loadProfile(uid: string): Promise<Profile | null> {
  const [userSnap, teacherSnap] = await Promise.all([
    adminDb().doc(`users/${uid}`).get(),
    adminDb().doc(`teachers/${uid}`).get(),
  ]);
  if (!userSnap.exists && !teacherSnap.exists) return null;
  const user = userSnap.data() ?? {};
  const teacher = teacherSnap.data() ?? {};
  const subjectsGrades = mapSubjectGrades(teacher.subjectsGrades ?? user.subjectsGrades);
  const role = (teacher.role || user.role || "teacher") as Role;
  const displayNameAr = String(teacher.name || user.displayNameAr || "");
  return {
    uid,
    teacherId: role === "student" ? undefined : uid,
    email: String(teacher.email || user.email || ""),
    username: String(teacher.username || user.username || "") || undefined,
    displayName: String(teacher.nameEn || user.displayName || displayNameAr),
    displayNameAr,
    role,
    classId: user.classId ? String(user.classId) : undefined,
    classIds: subjectsGrades.length
      ? classIdsFromAssignments(subjectsGrades)
      : Array.isArray(user.classIds)
        ? user.classIds.map(String)
        : undefined,
    subjectIds: subjectsGrades.length
      ? subjectIdsFromAssignments(subjectsGrades)
      : Array.isArray(user.subjectIds)
        ? user.subjectIds.map(String)
        : undefined,
    subjectsGrades,
  };
}

async function findUserByExactUsername(username: string): Promise<Profile | null> {
  const users = await adminDb()
    .collection("users")
    .where("username", "==", username)
    .limit(1)
    .get();
  if (!users.empty) return loadProfile(users.docs[0].id);
  const teachers = await adminDb()
    .collection("teachers")
    .where("username", "==", username)
    .limit(1)
    .get();
  if (!teachers.empty) return loadProfile(teachers.docs[0].id);
  return null;
}

export async function findUserByUsername(username: string): Promise<Profile | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;

  const exact = await findUserByExactUsername(trimmed);
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  if (lower !== trimmed) {
    const lowered = await findUserByExactUsername(lower);
    if (lowered) return lowered;
  }

  const [users, teachers] = await Promise.all([
    adminDb().collection("users").get(),
    adminDb().collection("teachers").get(),
  ]);
  const seen = new Set<string>();
  for (const doc of [...users.docs, ...teachers.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    const candidate = String(doc.data().username ?? "");
    if (candidate && usernamesMatch(candidate, trimmed)) {
      return loadProfile(doc.id);
    }
  }
  return null;
}

export async function requireProfile(): Promise<Profile | null> {
  const session = await readSession();
  if (!session) return null;
  if (session.role === "student" && session.uid.startsWith("guest-")) {
    const classId = session.classId || session.uid.slice("guest-".length);
    return guestProfile(classId);
  }
  return loadProfile(session.uid);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}
