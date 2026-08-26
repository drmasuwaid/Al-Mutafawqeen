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
import { formatGroupedSubjects, groupAssignments, newAssignmentId } from "@/lib/teachers";
import { useMergedSubjects } from "@/hooks/use-subjects";
import type { Profile, Subject, SubjectGrade } from "@/lib/types";

type PickedSubject = { id: string; nameAr: string };

function uniqueSubjects(items: PickedSubject[]) {
  const seen = new Set<string>();
  const next: PickedSubject[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

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
  const [pickerSubjectId, setPickerSubjectId] = useState("");
  const [pickedSubjects, setPickedSubjects] = useState<PickedSubject[]>([]);
  const [editGroup, setEditGroup] = useState<{ gradeId: string; sectionId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const catalog = useMergedSubjects(subjects);

  function resetForm() {
    setEditGroup(null);
    setGradeId("");
    setSectionId("");
    setPickerSubjectId("");
    setPickedSubjects([]);
  }

  function startEdit(row: SubjectGrade, source: SubjectGrade[]) {
    setEditGroup({ gradeId: row.gradeId, sectionId: row.sectionId });
    setGradeId(row.gradeId);
    setSectionId(row.sectionId);
    setPickerSubjectId("");
    setPickedSubjects(
      uniqueSubjects(
        source
          .filter((item) => item.gradeId === row.gradeId && item.sectionId === row.sectionId)
          .map((item) => ({ id: item.subjectId, nameAr: item.subjectNameAr }))
      )
    );
  }

  useEffect(() => {
    if (!open) return;
    const current = profile.subjectsGrades ?? [];
    setRows(current);
    const target = editingId ? current.find((row) => row.id === editingId) : null;
    if (target) startEdit(target, current);
    else resetForm();
  }, [open, editingId, profile.subjectsGrades]);

  function addPickedSubject() {
    if (!pickerSubjectId) {
      toast.error("اختر المادة الدراسية أولاً.");
      return;
    }
    const selected = catalog.find((item) => item.id === pickerSubjectId);
    if (!selected) {
      toast.error("اختر المادة الدراسية.");
      return;
    }
    if (pickedSubjects.some((item) => item.id === selected.id)) {
      toast.error("هذه المادة مضافة مسبقاً.");
      return;
    }
    setPickedSubjects((current) => [...current, { id: selected.id, nameAr: selected.nameAr }]);
    setPickerSubjectId("");
  }

  function removePickedSubject(id: string) {
    setPickedSubjects((current) => current.filter((item) => item.id !== id));
  }

  function submitRow() {
    if (!gradeId || !sectionId) {
      toast.error("اختر الصف والشعبة.");
      return;
    }
    if (!pickedSubjects.length) {
      toast.error("أضف مادة واحدة على الأقل.");
      return;
    }

    const previousIds = new Map<string, string>();
    let next = [...rows];
    if (editGroup) {
      for (const row of rows) {
        if (row.gradeId === editGroup.gradeId && row.sectionId === editGroup.sectionId) {
          previousIds.set(row.subjectId, row.id);
        }
      }
      next = next.filter(
        (row) => !(row.gradeId === editGroup.gradeId && row.sectionId === editGroup.sectionId)
      );
    }

    let added = 0;
    for (const subject of pickedSubjects) {
      const duplicate = next.some(
        (row) =>
          row.gradeId === gradeId && row.sectionId === sectionId && row.subjectId === subject.id
      );
      if (duplicate) continue;
      next.push({
        id: previousIds.get(subject.id) || newAssignmentId(),
        gradeId,
        sectionId,
        subjectId: subject.id,
        subjectNameAr: subject.nameAr,
      });
      added += 1;
    }

    if (!added) {
      toast.error("هذه المواد مضافة مسبقاً لهذه المرحلة والشعبة.");
      return;
    }

    const wasEdit = Boolean(editGroup);
    setRows(next);
    resetForm();
    toast.success(wasEdit ? "تم تحديث المرحلة." : "تمت إضافة المرحلة.");
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

  const availableSubjects = catalog.filter(
    (subject) => !pickedSubjects.some((item) => item.id === subject.id)
  );
  const groups = groupAssignments(rows);

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
          اختر الصف والشعبة، ثم أضف مادة أو أكثر من القائمة إلى الصندوق أدناه واحفظ.
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

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-600">المادة الدراسية</span>
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <NativeSelect
                  value={pickerSubjectId}
                  onChange={(event) => setPickerSubjectId(event.target.value)}
                >
                  <option value="">-- اختر المادة --</option>
                  {availableSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.nameAr}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <button
                type="button"
                onClick={addPickedSubject}
                className="h-12 shrink-0 rounded-xl bg-[#3b82f6] px-4 text-sm font-bold text-white hover:bg-[#2563eb]"
              >
                إضافة مادة
              </button>
            </div>
            <div className="min-h-[3.5rem] rounded-xl border border-slate-200 bg-slate-50 p-2">
              {pickedSubjects.length === 0 ? (
                <p className="px-2 py-2 text-sm text-slate-400">
                  لم تُضف مواد بعد. اختر مادة من القائمة ثم اضغط «إضافة مادة».
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pickedSubjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-800 ring-1 ring-blue-200"
                    >
                      {subject.nameAr}
                      <button
                        type="button"
                        className="flex size-5 items-center justify-center rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-800"
                        aria-label={`حذف ${subject.nameAr}`}
                        onClick={() => removePickedSubject(subject.id)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={submitRow}
            className="h-12 w-full rounded-xl bg-[#3b82f6] text-sm font-bold text-white"
          >
            {editGroup ? "حفظ تعديل المرحلة" : "إضافة المرحلة إلى القائمة"}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-700">المراحل المسندة</p>
          {groups.length === 0 ? (
            <p className="text-sm text-slate-400">لا توجد مراحل بعد.</p>
          ) : (
            groups.map((group) => {
              const cls = classById(group.key);
              const subjectsLabel = formatGroupedSubjects(group.subjectNamesAr);
              return (
                <div key={group.key} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">{cls?.gradeLabelAr}</p>
                    <p className="truncate text-xs text-slate-500">
                      {cls?.sectionLabelAr}
                      {subjectsLabel ? ` • ${subjectsLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      className="flex size-10 items-center justify-center text-blue-600"
                      onClick={() => {
                        const first = group.rows[0];
                        if (first) startEdit(first, rows);
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="flex size-10 items-center justify-center text-red-500"
                      onClick={() => {
                        setRows((current) =>
                          current.filter(
                            (item) =>
                              !(item.gradeId === group.gradeId && item.sectionId === group.sectionId)
                          )
                        );
                        if (
                          editGroup?.gradeId === group.gradeId &&
                          editGroup?.sectionId === group.sectionId
                        ) {
                          resetForm();
                        }
                      }}
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
