"use client";

import { useState } from "react";
import { GraduationCap, Loader2, LogOut, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { AccountDialog } from "@/components/account-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EmptyHomework, HomeworkItem } from "@/components/homework-item";
import { PublishDialog } from "@/components/publish-dialog";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [deleting, setDeleting] = useState<Homework | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  function assertOwnsHomework(item: Homework, action: "edit" | "delete") {
    if (isHomeworkOwner(teacher, item)) return true;
    toast.error(action === "delete" ? "يمكنك حذف واجباتك فقط." : "يمكنك تعديل واجباتك فقط.");
    return false;
  }

  function requestDeleteHomework(item: Homework) {
    if (!assertOwnsHomework(item, "delete")) return;
    setDeleting(item);
  }

  async function confirmDeleteHomework() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/homework/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "تعذر حذف الواجب");
      }
      setDeleting(null);
      toast.success("تم حذف الواجب.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الواجب");
    } finally {
      setDeleteBusy(false);
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
                <p className="text-sm text-blue-100">لم يُسند إليك مدير المدرسة أي مراحل بعد.</p>
              ) : (
                assignedGroups.map((group) => {
                  return (
                    <div
                      key={group.gradeId}
                      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-slate-800 sm:px-4"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <GraduationCap className="size-4" />
                      </span>
                      <p className="min-w-0 text-sm font-semibold leading-6">{group.line}</p>
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
                    key={`${item.id}-${item.updatedAt}`}
                    item={item}
                    subject={snapshot.subjects.find((row) => row.id === item.subjectId)}
                    currentUserId={teacher.teacherId || teacher.uid}
                    onEdit={(row) => {
                      if (!assertOwnsHomework(row, "edit")) return;
                      setEditing(row);
                      setPublishOpen(true);
                    }}
                    onDelete={requestDeleteHomework}
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
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        profile={profile}
        onSaved={(next) => setProfile(next)}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleting(null);
        }}
        title="تأكيد الحذف"
        description="هل أنت متأكد من رغبتك في حذف هذا الواجب؟ لا يمكن التراجع عن هذا الإجراء."
        busy={deleteBusy}
        onConfirm={() => void confirmDeleteHomework()}
      />
    </div>
  );
}

function TeacherAvatar() {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-full ring-2 ring-white/40"
      style={{ width: 54, height: 54, background: "#fff" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/teacher-avatar.png"
        alt="المدرس"
        width={54}
        height={54}
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          objectFit: "cover",
          background: "#fff",
        }}
      />
    </span>
  );
}
