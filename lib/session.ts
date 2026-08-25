import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { adminDb } from "@/lib/firebase-admin";
import type { Profile, Role } from "@/lib/types";

export const SESSION_COOKIE = "stf_session";

type SessionPayload = {
  uid: string;
  email: string;
  role: Role;
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
    };
  } catch {
    return null;
  }
}

export async function loadProfile(uid: string): Promise<Profile | null> {
  const snap = await adminDb().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return {
    uid,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    displayNameAr: String(data.displayNameAr ?? ""),
    role: data.role as Role,
    classId: data.classId ? String(data.classId) : undefined,
    classIds: Array.isArray(data.classIds)
      ? data.classIds.map(String)
      : undefined,
    subjectIds: Array.isArray(data.subjectIds)
      ? data.subjectIds.map(String)
      : undefined,
  };
}

export async function requireProfile(): Promise<Profile | null> {
  const session = await readSession();
  if (!session) return null;
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
