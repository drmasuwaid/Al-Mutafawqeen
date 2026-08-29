"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Settings, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AccountDialog } from "@/components/account-dialog";
import { AddSubjectDialog } from "@/components/add-subject-dialog";
import { TeacherFormDialog } from "@/components/add-teacher-dialog";
import { AppHeader } from "@/components/app-header";
import { PrincipalAvatar } from "@/components/principal-avatar";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { NativeSelect } from "@/components/native-select";
import { useAuth } from "@/hooks/use-auth";
import { useSubjects } from "@/hooks/use-subjects";
import { teacherMatchesQuery } from "@/lib/arabic";
import { GRADES } from "@/lib/catalog";
import { compareArabicNames, groupAssignmentsByGrade, teacherMatchesStaffFilters } from "@/lib/teachers";
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
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { subjects: catalog } = useSubjects();

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/teachers");
      const data = (await res.json()) as { teachers?: TeacherSummary[]; error?: string };
      if (!res.ok) throw new Error(data.error || "تعذر تحميل المدرسين");
      setTeachers(data.teachers ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل المدرسين";
      setLoadError(message);
      toast.error(message);
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

  const subjectOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const subject of catalog) names.set(subject.id, subject.nameAr);
    for (const teacher of teachers) {
      for (const row of teacher.subjectsGrades ?? []) {
        if (row.subjectId && !names.has(row.subjectId)) {
          names.set(row.subjectId, row.subjectNameAr || row.subjectId);
        }
      }
    }
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1], "ar"));
  }, [catalog, teachers]);

  const filtersActive = Boolean(query.trim() || gradeFilter || subjectFilter);

  const visibleTeachers = useMemo(
    () =>
      teachers.filter(
        (teacher) =>
          teacherMatchesQuery(teacher, query) &&
          teacherMatchesStaffFilters(teacher, { gradeId: gradeFilter, subjectId: subjectFilter })
      ),
    [teachers, query, gradeFilter, subjectFilter]
  );

  if (!profile) return null;

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-hidden bg-[#f4f6f8]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-10 sm:px-6">
        <AppHeader
          onBack={() => void signOut()}
          trailing={
            <button
              type="button"
              title="إضافة مادة جديدة"
              aria-label="إضافة مادة جديدة"
              onClick={() => setSubjectOpen(true)}
              className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition hover:bg-blue-100 hover:text-blue-700"
            >
              <Plus className="size-4" strokeWidth={2.75} />
            </button>
          }
        />

        <section className="overflow-hidden rounded-[24px] bg-[#4f46e5] p-4 text-white shadow-lg shadow-indigo-500/20 sm:rounded-[28px] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <PrincipalAvatar className="size-16 ring-2 ring-white/40 sm:size-[4.5rem]" />
              <div className="min-w-0">
                <p className="text-sm text-indigo-100">أهلاً بك، مدير المدرسة</p>
                <h2 className="truncate text-xl font-extrabold sm:text-2xl">{profile.displayNameAr}</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-400/40 px-4 text-sm font-bold hover:bg-indigo-400/55"
              >
                <Settings className="size-4" />
                تغيير معلومات الحساب
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
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
            الأسماء مرتبة أبجدياً. صفِّ حسب الصف أو المادة، أو ابحث بالاسم.
          </p>
          <div className="mt-4 space-y-3">
            <label className="relative block">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-600">الصف</span>
                <NativeSelect
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
                  aria-label="تصفية حسب الصف"
                >
                  <option value="">-- كل الصفوف --</option>
                  {GRADES.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.nameAr}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-600">المادة</span>
                <NativeSelect
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  aria-label="تصفية حسب المادة"
                >
                  <option value="">-- كل المواد --</option>
                  {subjectOptions.map(([id, nameAr]) => (
                    <option key={id} value={id}>
                      {nameAr}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
            {filtersActive ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-slate-400">
                  {visibleTeachers.length
                    ? `${visibleTeachers.length} من ${teachers.length} مدرس`
                    : "لا توجد نتائج لهذا التصنيف"}
                </p>
                <button
                  type="button"
                  className="font-semibold text-indigo-600 hover:text-indigo-700"
                  onClick={() => {
                    setQuery("");
                    setGradeFilter("");
                    setSubjectFilter("");
                  }}
                >
                  مسح التصنيف
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-indigo-500" />
            </div>
          ) : loadError ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
              <p>تعذر تحميل قائمة المدرسين.</p>
              <button
                type="button"
                className="mt-3 font-semibold text-indigo-700"
                onClick={() => void loadTeachers()}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : teachers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              لا يوجد مدرسون بعد. اضغط «إضافة مدرس جديد» لإنشاء أول حساب.
            </p>
          ) : visibleTeachers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              {query.trim()
                ? `لا يوجد مدرس يطابق «${query.trim()}» مع التصنيف الحالي.`
                : "لا يوجد مدرس في هذا الصف أو هذه المادة."}
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {visibleTeachers.map((teacher) => {
                const groups = groupAssignmentsByGrade(teacher.subjectsGrades);
                return (
                  <article key={teacher.id} className="soft-card p-4">
                    <div className="flex items-start gap-3">
                      <TeacherAvatar
                        nameAr={teacher.displayNameAr}
                        size={40}
                        className="ring-1 ring-indigo-100"
                      />
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
      <AddSubjectDialog open={subjectOpen} onOpenChange={setSubjectOpen} />
    </div>
  );
}
