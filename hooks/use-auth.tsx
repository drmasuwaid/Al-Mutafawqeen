"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { persistTeacherId, clearTeacherId } from "@/lib/teachers";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  profile: Profile | null;
  loading: boolean;
  signIn: (
    username: string,
    password: string,
    options?: { role?: "admin" | "teacher"; teacherId?: string }
  ) => Promise<void>;
  enterStudent: (gradeId: string, sectionId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  setProfile: (profile: Profile | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);

    fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { profile: Profile | null };
        return data.profile ?? null;
      })
      .then((next) => {
        if (!cancelled) {
          setProfile(next);
          if (next?.teacherId || (next && next.role !== "student")) {
            persistTeacherId(next.teacherId || next.uid);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const signIn = useCallback(
    async (
      username: string,
      password: string,
      options?: { role?: "admin" | "teacher"; teacherId?: string }
    ) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          role: options?.role,
          teacherId: options?.teacherId,
        }),
      });
      const data = (await res.json()) as { profile?: Profile; error?: string };
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "فشل تسجيل الدخول");
      }
      persistTeacherId(data.profile.teacherId || data.profile.uid);
      setProfile(data.profile);
    },
    []
  );

  const enterStudent = useCallback(async (gradeId: string, sectionId: string) => {
    const res = await fetch("/api/auth/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gradeId, sectionId }),
    });
    const data = (await res.json()) as { profile?: Profile; error?: string };
    if (!res.ok || !data.profile) {
      throw new Error(data.error || "تعذر الدخول لواجهة الطلاب");
    }
    setProfile(data.profile);
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearTeacherId();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (res.status === 401) {
      clearTeacherId();
      setProfile(null);
      return null;
    }
    const data = (await res.json()) as { profile?: Profile | null };
    const next = data.profile ?? null;
    setProfile(next);
    return next;
  }, []);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refreshProfile();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshProfile]);

  const value = useMemo(
    () => ({ profile, loading, signIn, enterStudent, signOut, refreshProfile, setProfile }),
    [profile, loading, signIn, enterStudent, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
