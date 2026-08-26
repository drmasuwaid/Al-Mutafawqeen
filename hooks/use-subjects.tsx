"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Subject } from "@/lib/types";

type SubjectsContextValue = {
  subjects: Subject[];
  loading: boolean;
  reload: () => Promise<void>;
  upsert: (subject: Subject) => void;
  addSubject: (nameAr: string) => Promise<{ subject: Subject; existing: boolean }>;
};

const SubjectsContext = createContext<SubjectsContextValue | null>(null);

export function sortSubjects(items: Subject[]) {
  return [...items].sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
}

export function mergeSubjects(...lists: (Subject[] | undefined)[]) {
  const map = new Map<string, Subject>();
  for (const list of lists) {
    for (const item of list ?? []) {
      if (item?.id) map.set(item.id, item);
    }
  }
  return sortSubjects([...map.values()]);
}

export function SubjectsProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch("/api/subjects", { cache: "no-store" });
    const data = (await res.json()) as { subjects?: Subject[] };
    setSubjects(sortSubjects(data.subjects ?? []));
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const upsert = useCallback((subject: Subject) => {
    setSubjects((current) => sortSubjects([...current.filter((item) => item.id !== subject.id), subject]));
  }, []);

  const addSubject = useCallback(
    async (nameAr: string) => {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameAr }),
      });
      const data = (await res.json()) as { subject?: Subject; existing?: boolean; error?: string };
      if (!res.ok || !data.subject?.id) {
        throw new Error(data.error || "تعذر إضافة المادة");
      }
      const subject: Subject = {
        id: data.subject.id,
        name: data.subject.name || data.subject.nameAr,
        nameAr: data.subject.nameAr,
        color: data.subject.color || "#2563eb",
      };
      upsert(subject);
      return { subject, existing: Boolean(data.existing) };
    },
    [upsert]
  );

  const value = useMemo(
    () => ({ subjects, loading, reload, upsert, addSubject }),
    [subjects, loading, reload, upsert, addSubject]
  );

  return <SubjectsContext.Provider value={value}>{children}</SubjectsContext.Provider>;
}

export function useSubjects() {
  const ctx = useContext(SubjectsContext);
  if (!ctx) {
    throw new Error("useSubjects must be used within SubjectsProvider");
  }
  return ctx;
}

export function useMergedSubjects(extra?: Subject[]) {
  const { subjects } = useSubjects();
  return useMemo(() => mergeSubjects(subjects, extra), [subjects, extra]);
}
