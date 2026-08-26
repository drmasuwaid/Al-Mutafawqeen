"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, GraduationCap, Loader2, LogOut, Pencil, Search, Settings, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AccountDialog } from "@/components/account-dialog";
import { TeacherFormDialog } from "@/components/add-teacher-dialog";
import { AppHeader } from "@/components/app-header";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { useAuth } from "@/hooks/use-auth";
import { teacherMatchesQuery } from "@/lib/arabic";
import { compareArabicNames, groupAssignmentsByGrade } from "@/lib/teachers";
import type { TeacherSummary } from "@/lib/types";

export function PrincipalDashboard() {
  const { profile, signOut, setProfile } = useAuth();
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherSummary | null>(null);
  const [deleting, setDeleting] = useState<TeacherSummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [query, setQuery] = useState("");

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers");
      const data = (await res.json()) as { teachers?: TeacherSummary[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setTeachers(data.teachers ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل المدرسين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  function upsertTeacher(teacher: TeacherSummary) {
    setTeachers((current) =>
      [...current.filter((item) => item.id !== teacher.id), teacher].sort((a, b) =>
        compareArabicNames(a.displayNameAr, b.displayNameAr)
      )
    );
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/teachers/${deleting.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "تعذر حذف المدرس");
      setTeachers((current) => current.filter((item) => item.id !== deleting.id));
      toast.success(`تم حذف ${deleting.displayNameAr} نهائياً.`);
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف المدرس");
    } finally {
      setDeleteBusy(false);
    }
  }

  const visibleTeachers = useMemo(
    () => teachers.filter((teacher) => teacherMatchesQuery(teacher, query)),
    [teachers, query]
  );

  if (!profile) return null;

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-hidden bg-[#f4f6f8]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-10 sm:px-6">
        <AppHeader onBack={() => void signOut()} />

        <section className="overflow-hidden rounded-[24px] bg-[#4f46e5] p-4 text-white shadow-lg shadow-indigo-500/20 sm:rounded-[28px] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 sm:size-16">
                <Building2 className="size-7" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-indigo-100">أهلاً بك، مدير المدرسة</p>
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-400/40 px-3 text-sm font-bold hover:bg-indigo-400/55"
              >
                <Settings className="size-4" />
                تغيير معلومات الحساب
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
              >
                <UserPlus className="size-4" />
                إضافة مدرس جديد
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-lg font-extrabold text-slate-900">الكادر التدريسي</h3>
          <p className="mt-1 text-sm text-slate-400">
            الأسماء مرتبة أبجدياً. يمكنك تعديل بيانات المدرس أو حذف حسابه من هنا.
          </p>
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input w-full"
              style={{ paddingRight: 42 }}
              dir="rtl"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              aria-label="بحث في الكادر التدريسي"
              autoComplete="off"
            />
          </label>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-indigo-500" />
            </div>
          ) : teachers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              لا يوجد مدرسون بعد. اضغط «إضافة مدرس جديد» لإنشاء أول حساب.
            </p>
          ) : visibleTeachers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              لا يوجد مدرس يطابق «{query.trim()}». جرّب الاسم دون همزات أو تاء مربوطة.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {visibleTeachers.map((teacher) => {
                const groups = groupAssignmentsByGrade(teacher.subjectsGrades);
                return (
                  <article key={teacher.id} className="soft-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <GraduationCap className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-900">{teacher.displayNameAr}</p>
                        <p className="text-xs text-slate-400">اسم المستخدم: {teacher.username}</p>
                        <div className="mt-3 space-y-1">
                          {groups.length === 0 ? (
                            <p className="text-sm text-slate-400">لم تُسند مراحل بعد.</p>
                          ) : (
                            groups.map((group) => (
                              <p key={group.gradeId} className="text-sm leading-6 text-slate-600">
                                {group.line}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => setEditing(teacher)}
                          className="flex size-10 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-50"
                          aria-label={`تعديل ${teacher.displayNameAr}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(teacher)}
                          className="flex size-10 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                          aria-label={`حذف ${teacher.displayNameAr}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <TeacherFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={upsertTeacher}
      />
      <TeacherFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        teacher={editing}
        onSaved={(teacher) => {
          upsertTeacher(teacher);
          setEditing(null);
        }}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleting(null);
        }}
        title="حذف المدرس"
        description={
          deleting
            ? `هل أنت متأكد من حذف «${deleting.displayNameAr}»؟ سيُحذف الحساب وواجباته نهائياً ولا يمكن التراجع.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
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
