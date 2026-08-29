"use client";

import { useState } from "react";
import { GraduationCap, LayoutGrid, Loader2, RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyHomework, HomeworkItem } from "@/components/homework-item";
import { StudentLoginDialog } from "@/components/student-login-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { SyncState } from "@/hooks/use-homework-live";
import { classById, parseClassId } from "@/lib/catalog";
import type { LiveSnapshot } from "@/lib/types";

export function StudentBoard({
  snapshot,
  error,
  onRetry,
  syncState,
}: {
  snapshot: LiveSnapshot | null;
  error: string | null;
  onRetry: () => void;
  syncState?: SyncState;
}) {
  const { profile, signOut } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const cls = profile?.classId ? classById(profile.classId) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f6f8]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-10 sm:px-6">
        <AppHeader onBack={() => void signOut()} syncState={syncState} />

        <section className="soft-card flex flex-1 flex-col p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  واجباتك المدرسية المنشورة:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    <GraduationCap className="size-3.5" />
                    {cls?.gradeLabelAr ?? "غير محدد"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    <LayoutGrid className="size-3.5" />
                    {cls?.sectionLabelAr ?? "الشعبة"}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 text-sm font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-[#2563eb] sm:w-auto"
            >
              <RefreshCw className="size-4" />
              تغيير الصف أو الشعبة
            </button>
          </div>

          {error ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>تعذر تحميل الواجبات المباشرة.</span>
              <Button variant="outline" size="sm" onClick={onRetry}>
                إعادة المحاولة
              </Button>
            </div>
          ) : null}

          <div className="mt-6 flex-1">
            {!snapshot ? (
              <div className="flex justify-center py-20">
                <Loader2 className="size-6 animate-spin text-blue-500" />
              </div>
            ) : snapshot.homework.length === 0 ? (
              <EmptyHomework className="min-h-[320px]" />
            ) : (
              <div className="grid gap-4">
                {snapshot.homework.map((item) => (
                  <HomeworkItem
                    key={`${item.id}-${item.updatedAt}`}
                    item={item}
                    subject={snapshot.subjects.find((row) => row.id === item.subjectId)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <StudentLoginDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialGradeId={profile?.classId ? parseClassId(profile.classId).gradeId : ""}
        initialSectionId={profile?.classId ? parseClassId(profile.classId).sectionId : ""}
      />
    </div>
  );
}
