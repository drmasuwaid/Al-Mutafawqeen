"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { GRADES, SECTIONS, classById } from "@/lib/catalog";
import { newAssignmentId } from "@/lib/teachers";
import type { Profile, Subject, SubjectGrade } from "@/lib/types";

export function StagesDialog({
  open,
  onOpenChange,
  profile,
  subjects,
  editingId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  subjects: Subject[];
  editingId?: string | null;
  onSaved: (profile: Profile) => void;
}) {
  const [rows, setRows] = useState<SubjectGrade[]>(profile.subjectsGrades ?? []);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function fill(row?: SubjectGrade | null) {
    setEditId(row?.id ?? null);
    setGradeId(row?.gradeId ?? "");
    setSectionId(row?.sectionId ?? "");
    setSubjectId(row?.subjectId ?? "");
    setCustomSubject("");
  }

  useEffect(() => {
    if (!open) return;
    const current = profile.subjectsGrades ?? [];
    setRows(current);
    const target = editingId ? current.find((row) => row.id === editingId) : null;
    fill(target);
  }, [open, editingId, profile.subjectsGrades]);

  async function resolveSubject() {
    if (customSubject.trim()) {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameAr: customSubject.trim() }),
      });
      const data = (await res.json()) as { error?: string; subject?: Subject };
      if (!res.ok || !data.subject) throw new Error(data.error || "تعذر إضافة المادة");
      return { id: data.subject.id, nameAr: data.subject.nameAr };
    }
    const selected = subjects.find((item) => item.id === subjectId);
    if (!selected) throw new Error("اختر المادة الدراسية.");
    return { id: selected.id, nameAr: selected.nameAr };
  }

  function addOrUpdate(next: SubjectGrade) {
    const exists = rows.some(
      (row) =>
        row.id !== next.id &&
        row.gradeId === next.gradeId &&
        row.sectionId === next.sectionId &&
        row.subjectId === next.subjectId
    );
    if (exists) throw new Error("هذه المرحلة والشعبة والمادة مضافة مسبقاً.");
    setRows((current) => {
      const index = current.findIndex((row) => row.id === next.id);
      if (index >= 0) {
        const copy = [...current];
        copy[index] = next;
        return copy;
      }
      return [...current, next];
    });
  }

  async function submitRow() {
    if (!gradeId || !sectionId) {
      toast.error("اختر الصف والشعبة.");
      return;
    }
    try {
      const subject = await resolveSubject();
      addOrUpdate({
        id: editId || newAssignmentId(),
        gradeId,
        sectionId,
        subjectId: subject.id,
        subjectNameAr: subject.nameAr,
      });
      fill(null);
      toast.success(editId ? "تم تحديث المرحلة." : "تمت إضافة المرحلة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    }
  }

  async function saveAll() {
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectsGrades: rows }),
      });
      const data = (await res.json()) as { error?: string; profile?: Profile };
      if (!res.ok || !data.profile) throw new Error(data.error);
      onSaved(data.profile);
      onOpenChange(false);
      toast.success("تم حفظ المراحل والشعب.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
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
        <DialogTitle className="text-xl font-extrabold">إضافة / تعديل المراحل</DialogTitle>
        <DialogDescription>
          اختر الصف والشعبة والمادة من القوائم، أو أضف مادة جديدة ثم احفظ.
        </DialogDescription>

        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-600">الصف / المرحلة</span>
            <NativeSelect value={gradeId} onChange={(event) => setGradeId(event.target.value)}>
              <option value="">-- اختر الصف --</option>
              {GRADES.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.nameAr}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-600">الشعبة</span>
            <NativeSelect value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              <option value="">-- اختر الشعبة --</option>
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  شعبة {section.ar}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-600">المادة الدراسية</span>
            <NativeSelect
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setCustomSubject("");
              }}
            >
              <option value="">-- اختر المادة --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.nameAr}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-600">أو أضف مادة جديدة</span>
            <input
              className="field-input w-full"
              placeholder="مثال: علم الأرض"
              value={customSubject}
              onChange={(event) => setCustomSubject(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void submitRow()}
            className="h-12 w-full rounded-xl bg-[#3b82f6] text-sm font-bold text-white"
          >
            {editId ? "حفظ تعديل المرحلة" : "إضافة المرحلة إلى القائمة"}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-700">المراحل المسندة</p>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">لا توجد مراحل بعد.</p>
          ) : (
            rows.map((row) => {
              const cls = classById(`${row.gradeId}-${row.sectionId}`);
              return (
                <div key={row.id} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">{cls?.gradeLabelAr}</p>
                    <p className="truncate text-xs text-slate-500">
                      {cls?.sectionLabelAr} · {row.subjectNameAr}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" className="flex size-10 items-center justify-center text-blue-600" onClick={() => fill(row)}>
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="flex size-10 items-center justify-center text-red-500"
                      onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={busy}
            className="h-12 flex-1 rounded-xl bg-[#3b82f6] font-bold text-white"
          >
            حفظ الكل
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
