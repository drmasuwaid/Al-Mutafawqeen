"use client";

import { useState } from "react";
import { GraduationCap, Layers, Loader2, LogOut, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { AccountDialog } from "@/components/account-dialog";
import { EmptyHomework, HomeworkItem } from "@/components/homework-item";
import { PublishDialog } from "@/components/publish-dialog";
import { StagesDialog } from "@/components/stages-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { classById } from "@/lib/catalog";
import { groupAssignmentsByGrade, isHomeworkOwner } from "@/lib/teachers";
import type { Homework, LiveSnapshot, SubjectGrade } from "@/lib/types";

export function TeacherDashboard({
  snapshot,
  error,
  onRetry,
  onPublished,
}: {
  snapshot: LiveSnapshot | null;
  error: string | null;
  onRetry: () => void;
  onPublished: () => void;
}) {
  const { profile, signOut, setProfile } = useAuth();
  const [publishOpen, setPublishOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);

  if (!profile) return null;
  const teacher = profile;
  const assignedRows = teacher.subjectsGrades?.length
    ? teacher.subjectsGrades
    : (teacher.classIds ?? []).map((id) => {
        const cls = classById(id);
        return {
          id,
          gradeId: cls?.gradeId ?? "",
          sectionId: cls?.sectionId ?? "",
          subjectId: teacher.subjectIds?.[0] ?? "",
          subjectNameAr: snapshot?.subjects.find((subject) => subject.id === teacher.subjectIds?.[0])?.nameAr ?? "",
        } satisfies SubjectGrade;
      });
  const assignedGroups = groupAssignmentsByGrade(assignedRows);

  async function removeAssignmentGrade(gradeId: string) {
    const subjectsGrades = (teacher.subjectsGrades ?? assignedRows).filter(
      (row) => row.gradeId !== gradeId
    );
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectsGrades }),
    });
    const data = (await res.json()) as { error?: string; profile?: typeof teacher };
    if (!res.ok || !data.profile) {
      toast.error(data.error || "تعذر حذف المرحلة.");
      return;
    }
    setProfile(data.profile);
  }

  function assertOwnsHomework(item: Homework, action: "edit" | "delete") {
    if (isHomeworkOwner(teacher, item)) return true;
    toast.error(action === "delete" ? "يمكنك حذف واجباتك فقط." : "يمكنك تعديل واجباتك فقط.");
    return false;
  }

  async function removeHomework(item: Homework) {
    if (!assertOwnsHomework(item, "delete")) return;
    const res = await fetch(`/api/homework/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error || "تعذر حذف الواجب");
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-hidden bg-[#f4f6f8]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-10 sm:px-6">
        <AppHeader onBack={() => void signOut()} />

        <section className="overflow-hidden rounded-[24px] bg-[#3b82f6] p-4 text-white shadow-lg shadow-blue-500/20 sm:rounded-[28px] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <TeacherAvatar />
              <div className="min-w-0">
                <p className="text-sm text-blue-100">أهلاً بك، أستاذ</p>
                <h2 className="truncate text-xl font-extrabold sm:text-2xl">{profile.displayNameAr}</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-500 px-3 text-sm font-bold text-white hover:bg-red-600"
              >
                <LogOut className="size-4" />
                خروج
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAssignment(null);
                  setStagesOpen(true);
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-400/40 px-3 text-sm font-bold hover:bg-blue-400/55"
              >
                <Layers className="size-4" />
                إضافة / تعديل المراحل
              </button>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-400/40 px-3 text-sm font-bold hover:bg-blue-400/55"
              >
                <Settings className="size-4" />
                تغيير معلومات الحساب
              </button>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm text-blue-100">المراحل والشعب المسندة إليك:</p>
            <div className="flex flex-col gap-2">
              {assignedGroups.length === 0 ? (
                <p className="text-sm text-blue-100">لم تُسند إليك مراحل بعد. أضف مرحلة للبدء بالنشر.</p>
              ) : (
                assignedGroups.map((group) => {
                  return (
                    <div
                      key={group.gradeId}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 text-slate-800 sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <GraduationCap className="size-4" />
                        </span>
                        <p className="min-w-0 text-sm font-semibold leading-6">{group.line}</p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssignment(group.rows[0]?.id ?? null);
                            setStagesOpen(true);
                          }}
                          className="flex size-10 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50"
                          aria-label="تعديل"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeAssignmentGrade(group.gradeId)}
                          className="flex size-10 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                          aria-label="حذف"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <div className="mt-5 flex sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setPublishOpen(true);
            }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 hover:bg-[#2563eb] sm:w-auto"
          >
            <Plus className="size-5" />
            نشر واجب جديد
          </button>
        </div>

        <section className="mt-6">
          <h3 className="text-lg font-extrabold text-slate-900">سجل الواجبات المنشورة</h3>
          <p className="mt-1 text-sm text-slate-400">
            تظهر الواجبات للطلاب فور النشر. التعديل والحذف لصاحب الواجب فقط.
          </p>

          {error ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>تعذر تحميل السجل المباشر.</span>
              <Button variant="outline" size="sm" onClick={onRetry}>
                إعادة المحاولة
              </Button>
            </div>
          ) : null}

          <div className="mt-4">
            {!snapshot ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-blue-500" />
              </div>
            ) : snapshot.homework.length === 0 ? (
              <EmptyHomework
                title="لا توجد واجبات منشورة حالياً"
                body="اضغط «نشر واجب جديد» لإرسال أول تكليف إلى شعبك."
              />
            ) : (
              <div className="grid gap-4">
                {snapshot.homework.map((item) => (
                  <HomeworkItem
                    key={item.id}
                    item={item}
                    subject={snapshot.subjects.find((row) => row.id === item.subjectId)}
                    currentUserId={teacher.teacherId || teacher.uid}
                    onEdit={(row) => {
                      if (!assertOwnsHomework(row, "edit")) return;
                      setEditing(row);
                      setPublishOpen(true);
                    }}
                    onDelete={removeHomework}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <PublishDialog
        key={editing?.id ?? "new"}
        open={publishOpen}
        onOpenChange={(open) => {
          setPublishOpen(open);
          if (!open) setEditing(null);
        }}
        profile={profile}
        subjects={snapshot?.subjects ?? []}
        homework={editing}
        onPublished={onPublished}
      />
      <StagesDialog
        open={stagesOpen}
        onOpenChange={(open) => {
          setStagesOpen(open);
          if (!open) setEditingAssignment(null);
        }}
        profile={profile}
        subjects={snapshot?.subjects ?? []}
        editingId={editingAssignment}
        onSaved={(next) => setProfile(next)}
      />
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        profile={profile}
        onSaved={(next) => setProfile(next)}
      />
    </div>
  );
}

function TeacherAvatar() {
  return (
    <span className="relative flex size-14 overflow-hidden rounded-full bg-blue-100 ring-2 ring-white/40 sm:size-16">
      <svg viewBox="0 0 80 80" className="size-full">
        <circle cx="40" cy="40" r="40" fill="#dbeafe" />
        <circle cx="40" cy="30" r="14" fill="#f8d7b0" />
        <ellipse cx="40" cy="64" rx="22" ry="18" fill="#1d4ed8" />
        <rect x="18" y="28" width="44" height="8" rx="4" fill="#1e293b" opacity="0.85" />
        <circle cx="28" cy="32" r="5" fill="none" stroke="#1e293b" strokeWidth="2" />
        <circle cx="52" cy="32" r="5" fill="none" stroke="#1e293b" strokeWidth="2" />
        <path d="M33 32h14" stroke="#1e293b" strokeWidth="2" />
        <path d="M20 18c8-10 32-10 40 0" fill="none" stroke="#0f172a" strokeWidth="6" />
      </svg>
    </span>
  );
}
