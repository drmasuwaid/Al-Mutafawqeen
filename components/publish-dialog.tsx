"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudUpload, Loader2, PenLine, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { attachmentFrameClass } from "@/lib/attachment-url";
import { classById, parseClassId } from "@/lib/catalog";
import { teacherClassIds } from "@/lib/teachers";
import type { Attachment, Homework, Profile, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_FILE = 8 * 1024 * 1024;

export function PublishDialog({
  open,
  onOpenChange,
  profile,
  subjects,
  homework,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  subjects: Subject[];
  homework?: Homework | null;
  onPublished?: () => void;
}) {
  const assignments = profile.subjectsGrades ?? [];
  const grades = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignments) {
      const cls = classById(`${row.gradeId}-${row.sectionId}`);
      if (cls) map.set(row.gradeId, cls.gradeLabelAr);
    }
    if (!map.size) {
      for (const id of teacherClassIds(profile)) {
        const cls = classById(id);
        if (cls) map.set(cls.gradeId, cls.gradeLabelAr);
      }
    }
    return [...map.entries()];
  }, [assignments, profile]);

  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [titleAr, setTitleAr] = useState("");
  const [detailsAr, setDetailsAr] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [existingFiles, setExistingFiles] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const gradeSections = useMemo(() => {
    const fromAssignments = assignments
      .filter((row) => row.gradeId === gradeId)
      .map((row) => row.sectionId);
    const unique = [...new Set(fromAssignments)];
    if (unique.length) return unique;
    return teacherClassIds(profile)
      .map((id) => parseClassId(id))
      .filter((item) => item.gradeId === gradeId)
      .map((item) => item.sectionId);
  }, [assignments, gradeId, profile]);

  const allowedSubjects = useMemo(() => {
    const ids = new Set(
      assignments.filter((row) => row.gradeId === gradeId).map((row) => row.subjectId)
    );
    if (profile.role === "admin" || !ids.size) {
      return subjects.filter((item) => profile.role === "admin" || profile.subjectIds?.includes(item.id) || ids.has(item.id));
    }
    return subjects.filter((item) => ids.has(item.id));
  }, [assignments, gradeId, profile.role, profile.subjectIds, subjects]);

  useEffect(() => {
    if (!open) return;
    const nextGrade = homework ? parseClassId(homework.classId).gradeId : grades[0]?.[0] ?? "";
    setGradeId(nextGrade);
    setSubjectId(homework?.subjectId ?? "");
    setSectionIds(homework ? homework.classIds.map((id) => parseClassId(id).sectionId) : []);
    setTitleAr(homework?.titleAr ?? "");
    setDetailsAr(homework?.detailsAr ?? "");
    setDueAt(homework?.dueAt ? homework.dueAt.slice(0, 10) : "");
    setExistingFiles(homework?.attachments ?? []);
    setPendingFiles([]);
  }, [open, homework, grades]);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const next = [...pendingFiles];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE) {
        toast.error(`الملف ${file.name} أكبر من 8 ميجابايت`);
        continue;
      }
      next.push(file);
    }
    setPendingFiles(next);
  }

  async function publish() {
    if (!gradeId || !subjectId || !sectionIds.length || !titleAr.trim()) {
      toast.error("أكمل المرحلة والمادة والشعب وعنوان الواجب.");
      return;
    }
    const classIds = sectionIds.map((sectionId) => `${gradeId}-${sectionId}`);
    setBusy(true);
    try {
      const payload = {
        titleAr: titleAr.trim(),
        title: titleAr.trim(),
        detailsAr: detailsAr.trim(),
        details: detailsAr.trim(),
        subjectId,
        classIds,
        dueAt: dueAt || null,
        attachments: existingFiles,
      };
      const form = new FormData();
      form.append("payload", JSON.stringify(payload));
      pendingFiles.forEach((file) => form.append("files", file));
      const res = await fetch(homework ? `/api/homework/${homework.id}` : "/api/homework", {
        method: homework ? "PATCH" : "POST",
        body: form,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success(homework ? "تم حفظ التعديلات." : "تم نشر الواجب للطلاب.");
      onOpenChange(false);
      onPublished?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر نشر الواجب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto sm:max-w-2xl" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 flex size-10 items-center justify-center text-slate-400"
          onClick={() => onOpenChange(false)}
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3 pt-1">
          <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <PenLine className="size-5" />
          </span>
          <div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              {homework ? "تعديل الواجب" : "نشر واجب جديد"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-400">
              إرسال الواجب والمرفقات للطلاب لحظياً
            </DialogDescription>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-600">المرحلة الدراسية المسندة لك:</span>
            <NativeSelect
              value={gradeId}
              onChange={(event) => {
                setGradeId(event.target.value);
                setSectionIds([]);
              }}
            >
              <option value="">-- اختر المرحلة الدراسية --</option>
              {grades.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-600">المادة الدراسية:</span>
            <NativeSelect value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!gradeId}>
              <option value="">-- اختر الصف أولاً --</option>
              {allowedSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.nameAr}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-600">الشعب المستهدفة:</span>
          {!gradeId ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
              اختر المرحلة لعرض الشعب
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 p-3">
              {gradeSections.map((id) => {
                const cls = classById(`${gradeId}-${id}`);
                return (
                  <label key={id} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={sectionIds.includes(id)}
                      onChange={(event) => {
                        setSectionIds((current) =>
                          event.target.checked ? [...current, id] : current.filter((value) => value !== id)
                        );
                      }}
                    />
                    {cls?.sectionLabelAr ?? id}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">عنوان الواجب:</span>
          <input
            className="field-input w-full"
            placeholder="مثال: حل تمارين معادلات الدرجة الثانية"
            value={titleAr}
            onChange={(event) => setTitleAr(event.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">نص وتفاصيل الواجب:</span>
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/15"
            placeholder="اكتب التعليمات والمسائل والصفحات المطلوب حلها بالتفصيل..."
            value={detailsAr}
            onChange={(event) => setDetailsAr(event.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">آخر موعد للتسليم (اختياري):</span>
          <input type="date" className="field-input w-full" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-600">المرفقات (صور، PDF، مستندات):</span>
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
          >
            <CloudUpload className="size-8 text-blue-500" />
            <p className="mt-3 text-sm font-semibold text-blue-700">اضغط لرفع المرفقات أو اسحب الملفات هنا</p>
            <p className="mt-1 text-xs text-slate-400">يدعم الصور وملفات PDF بحد أقصى 8 ميجابايت</p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <ul className="space-y-2 text-sm text-slate-600">
            {existingFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2",
                  attachmentFrameClass(file)
                )}
              >
                <span className="truncate">{file.name}</span>
                <button type="button" className="text-red-500" onClick={() => setExistingFiles((current) => current.filter((_, i) => i !== index))}>
                  حذف
                </button>
              </li>
            ))}
            {pendingFiles.map((file, index) => (
              <li
                key={`${file.name}-new-${index}`}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2",
                  attachmentFrameClass(file)
                )}
              >
                <span className="truncate">{file.name} (جديد)</span>
                <button type="button" className="text-red-500" onClick={() => setPendingFiles((current) => current.filter((_, i) => i !== index))}>
                  حذف
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void publish()}
            disabled={busy}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#3b82f6] text-sm font-bold text-white hover:bg-[#2563eb] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : homework ? "حفظ التعديلات" : "نشر الواجب الآن"}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600">
            إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
