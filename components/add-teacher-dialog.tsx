"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { MultiAddPicker, type PickerOption } from "@/components/multi-add-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GRADES, SECTIONS } from "@/lib/catalog";
import { pickerGradeSectionsFromAssignments, type GradeSectionPicker } from "@/lib/teachers";
import { useSubjects } from "@/hooks/use-subjects";
import type { TeacherSummary } from "@/lib/types";

function emptyGrade(grade: PickerOption, previous?: GradeSectionPicker): GradeSectionPicker {
  return {
    id: grade.id,
    nameAr: grade.nameAr,
    sections: previous?.id === grade.id ? previous.sections : [],
    subjects: previous?.id === grade.id ? previous.subjects : [],
  };
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: TeacherSummary | null;
  onSaved: (teacher: TeacherSummary) => void;
}) {
  const isEdit = Boolean(teacher);
  const [nameAr, setNameAr] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [grades, setGrades] = useState<GradeSectionPicker[]>([]);
  const { subjects: catalog, reload } = useSubjects();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setNameAr("");
      setUsername("");
      setPassword("");
      setGrades([]);
      return;
    }
    if (teacher) {
      const selected = pickerGradeSectionsFromAssignments(teacher.subjectsGrades);
      setNameAr(teacher.displayNameAr);
      setUsername(teacher.username);
      setPassword("");
      setGrades(selected.grades);
    } else {
      setNameAr("");
      setUsername("");
      setPassword("");
      setGrades([]);
    }
    void reload();
  }, [open, teacher, reload]);

  function updateGrade(gradeId: string, patch: Partial<Pick<GradeSectionPicker, "sections" | "subjects">>) {
    setGrades((current) =>
      current.map((row) => (row.id === gradeId ? { ...row, ...patch } : row))
    );
  }

  async function save() {
    if (!grades.length) {
      toast.error("أضف مرحلة وشعبة ومادة واحدة على الأقل.");
      return;
    }
    if (grades.some((grade) => grade.sections.length === 0)) {
      toast.error("أضف شعبة واحدة على الأقل لكل مرحلة.");
      return;
    }
    if (grades.some((grade) => grade.subjects.length === 0)) {
      toast.error("أضف مادة واحدة على الأقل لكل مرحلة.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(isEdit ? `/api/teachers/${teacher!.id}` : "/api/teachers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameAr: nameAr.trim(),
          username: username.trim(),
          password: password.trim() || undefined,
          gradeSections: grades.map((item) => ({
            gradeId: item.id,
            sectionIds: item.sections.map((section) => section.id),
            subjectIds: item.subjects.map((subject) => subject.id),
          })),
        }),
      });
      const data = (await res.json()) as { error?: string; teacher?: TeacherSummary };
      if (!res.ok || !data.teacher) throw new Error(data.error || "تعذر حفظ المدرس");
      toast.success(isEdit ? "تم تحديث بيانات المدرس." : "تم إضافة المدرس وحفظ بياناته.");
      onSaved(data.teacher);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ المدرس");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 flex size-10 items-center justify-center text-slate-400 hover:text-slate-600"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3 pt-1">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            {isEdit ? <Pencil className="size-5" /> : <UserPlus className="size-5" />}
          </span>
          <div>
            <DialogTitle className="text-xl font-extrabold">
              {isEdit ? "تعديل بيانات المدرس" : "إضافة مدرس جديد"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-400">
              {isEdit
                ? "حدّث الاسم واسم المستخدم، ولكل مرحلة شعبها ومادتها. اترك كلمة المرور فارغة للإبقاء عليها."
                : "حدّد الاسم، ثم لكل مرحلة شعبها ومادتها، ثم اسم المستخدم وكلمة المرور الأولية."}
            </DialogDescription>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">الاسم الكامل</span>
          <input
            className="field-input w-full"
            placeholder="مثال: أ. سارة محمود"
            value={nameAr}
            onChange={(event) => setNameAr(event.target.value)}
          />
        </label>

        <MultiAddPicker
          label="المراحل الدراسية"
          placeholder="-- اختر المرحلة --"
          options={GRADES.map((grade) => ({ id: grade.id, nameAr: grade.nameAr }))}
          selected={grades.map((grade) => ({ id: grade.id, nameAr: grade.nameAr }))}
          onChange={(next) =>
            setGrades((current) =>
              next.map((grade) => emptyGrade(grade, current.find((row) => row.id === grade.id)))
            )
          }
        />
        {grades.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400">
            أضف مرحلة أولاً لتعيين الشعب والمادة الخاصة بها.
          </p>
        ) : (
          <div className="space-y-3">
            {grades.map((grade) => (
              <div
                key={grade.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <p className="text-sm font-extrabold text-slate-800">{grade.nameAr}</p>
                <MultiAddPicker
                  label={`شعب ${grade.nameAr}`}
                  placeholder="-- اختر الشعبة --"
                  options={SECTIONS.map((section) => ({
                    id: section.id,
                    nameAr: `شعبة ${section.ar}`,
                  }))}
                  selected={grade.sections}
                  onChange={(sections) => updateGrade(grade.id, { sections })}
                />
                <MultiAddPicker
                  label={`مادة ${grade.nameAr}`}
                  placeholder="-- اختر المادة --"
                  options={catalog.map((subject) => ({ id: subject.id, nameAr: subject.nameAr }))}
                  selected={grade.subjects}
                  onChange={(subjects) => updateGrade(grade.id, { subjects })}
                />
              </div>
            ))}
          </div>
        )}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">اسم المستخدم</span>
          <input
            className="field-input w-full"
            placeholder="يستخدم لتسجيل الدخول"
            value={username}
            autoComplete="off"
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">
            {isEdit ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور الأولية"}
          </span>
          <input
            className="field-input w-full"
            type="password"
            placeholder={isEdit ? "اتركها فارغة للإبقاء على الحالية" : "6 أحرف على الأقل"}
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#3b82f6] font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "حفظ التعديلات" : "حفظ المدرس"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 rounded-xl bg-slate-100 px-5 font-semibold text-slate-600"
          >
            إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddTeacherDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (teacher: TeacherSummary) => void;
}) {
  return (
    <TeacherFormDialog open={open} onOpenChange={onOpenChange} onSaved={onCreated} />
  );
}
