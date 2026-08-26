import { adminAuth, authSignInUrl } from "@/lib/firebase-admin";
import { findUserByUsername } from "@/lib/session";

type AuthResponse = {
  localId?: string;
  email?: string;
  error?: { message?: string };
};

export function mapFirebaseAuthError(message?: string) {
  const code = String(message || "")
    .split(":")[0]
    .trim()
    .toUpperCase();
  if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
    return "تم إيقاف الدخول مؤقتاً بعد محاولات كثيرة. انتظر بضع دقائق ثم أعد المحاولة بنفس كلمة المرور.";
  }
  if (code === "USER_DISABLED") {
    return "هذا الحساب معطّل.";
  }
  return "اسم المستخدم أو كلمة المرور غير صحيحة.";
}

export async function resolveStaffEmail(identifier: string) {
  if (identifier.includes("@")) {
    return { email: identifier };
  }
  const matched = await findUserByUsername(identifier);
  if (!matched) {
    return { error: "لا يوجد حساب بهذا اسم المستخدم.", status: 401 as const };
  }
  try {
    const authUser = await adminAuth().getUser(matched.uid);
    const email = authUser.email || matched.email;
    if (!email) {
      return { error: "لا يوجد حساب بهذا اسم المستخدم.", status: 401 as const };
    }
    return { email, uid: matched.uid };
  } catch {
    if (!matched.email) {
      return { error: "لا يوجد حساب بهذا اسم المستخدم.", status: 401 as const };
    }
    return { email: matched.email, uid: matched.uid };
  }
}

export async function signInWithEmailPassword(email: string, password: string) {
  const authRes = await fetch(authSignInUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const payload = (await authRes.json()) as AuthResponse;
  return { ok: authRes.ok, payload };
}

export async function emailForUid(uid: string, fallback?: string) {
  try {
    const authUser = await adminAuth().getUser(uid);
    return authUser.email || fallback || "";
  } catch {
    return fallback || "";
  }
}
