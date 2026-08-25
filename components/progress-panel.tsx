"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";
import type { Homework, Profile, SchoolClass, Subject } from "@/lib/types";

export function ProgressPanel({
  homework,
  classes,
  subjects,
  students,
}: {
  homework: Homework[];
  classes: SchoolClass[];
  subjects: Subject[];
  students: Profile[];
}) {
  const { t, locale } = useLocale();
  const nameOf = (item?: { name: string; nameAr: string }) =>
    item ? (locale === "ar" ? item.nameAr : item.name) : "—";

  if (homework.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-teal-900/15 bg-white/60 px-6 py-16 text-center">
        <h2 className="text-lg font-semibold text-teal-950">{t.emptyTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {homework.map((item) => {
        const classItem = classes.find((row) => row.id === item.classId);
        const subject = subjects.find((row) => row.id === item.subjectId);
        const roster = students.filter((student) => student.classId === item.classId);
        const doneIds = new Set(
          item.completions.filter((row) => row.status === "done").map((row) => row.studentId)
        );
        return (
          <Card key={item.id}>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {locale === "ar" ? item.titleAr : item.title}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nameOf(subject)} · {nameOf(classItem)}
                  </p>
                </div>
                <p className="text-sm font-medium text-teal-900">
                  {doneIds.size}/{roster.length || item.completions.length} {t.completedOf}
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {roster.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.noStudents}</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {roster.map((student) => {
                    const done = doneIds.has(student.uid);
                    return (
                      <li
                        key={student.uid}
                        className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
                      >
                        <span>{locale === "ar" ? student.displayNameAr : student.displayName}</span>
                        <span className={done ? "text-emerald-700" : "text-muted-foreground"}>
                          {done ? t.done : t.pending}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
