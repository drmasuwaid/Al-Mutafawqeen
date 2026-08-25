"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  enterStudent: (gradeId: string, sectionId: string) => Promise<void>;
  signOut: () => Promise<void>;
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
        if (!cancelled) setProfile(next);
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

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = (await res.json()) as { profile?: Profile; error?: string };
    if (!res.ok || !data.profile) {
      throw new Error(data.error || "فشل تسجيل الدخول");
    }
    setProfile(data.profile);
  }, []);

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
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ profile, loading, signIn, enterStudent, signOut, setProfile }),
    [profile, loading, signIn, enterStudent, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
