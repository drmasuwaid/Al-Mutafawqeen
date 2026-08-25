"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { MultiAddPicker, type PickerOption } from "@/components/multi-add-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GRADES, SECTIONS } from "@/lib/catalog";
import type { Subject, TeacherSummary } from "@/lib/types";

export function AddTeacherDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (teacher: TeacherSummary) => void;
}) {
  const [nameAr, setNameAr] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [grades, setGrades] = useState<PickerOption[]>([]);
  const [sections, setSections] = useState<PickerOption[]>([]);
  const [subjects, setSubjects] = useState<PickerOption[]>([]);
  const [catalog, setCatalog] = useState<Subject[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setNameAr("");
      setUsername("");
      setPassword("");
      setGrades([]);
      setSections([]);
      setSubjects([]);
      return;
    }
    fetch("/api/subjects")
      .then(async (res) => {
        const data = (await res.json()) as { subjects?: Subject[] };
        setCatalog(data.subjects ?? []);
      })
      .catch(() => setCatalog([]));
  }, [open]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameAr: nameAr.trim(),
          username: username.trim(),
          password,
          gradeIds: grades.map((item) => item.id),
          sectionIds: sections.map((item) => item.id),
          subjectIds: subjects.map((item) => item.id),
        }),
      });
      const data = (await res.json()) as { error?: string; teacher?: TeacherSummary };
      if (!res.ok || !data.teacher) throw new Error(data.error || "تعذر حفظ المدرس");
      toast.success("تم إضافة المدرس وحفظ بياناته.");
      onCreated(data.teacher);
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
            <UserPlus className="size-5" />
          </span>
          <div>
            <DialogTitle className="text-xl font-extrabold">إضافة مدرس جديد</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-400">
              حدّد الاسم والمراحل والشعب والمواد ثم اسم المستخدم وكلمة المرور الأولية.
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
          selected={grades}
          onChange={setGrades}
        />
        <MultiAddPicker
          label="الشعب"
          placeholder="-- اختر الشعبة --"
          options={SECTIONS.map((section) => ({ id: section.id, nameAr: `شعبة ${section.ar}` }))}
          selected={sections}
          onChange={setSections}
        />
        <MultiAddPicker
          label="المواد الدراسية"
          placeholder="-- اختر المادة --"
          options={catalog.map((subject) => ({ id: subject.id, nameAr: subject.nameAr }))}
          selected={subjects}
          onChange={setSubjects}
        />

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
          <span className="text-sm font-medium text-slate-600">كلمة المرور الأولية</span>
          <input
            className="field-input w-full"
            type="password"
            placeholder="6 أحرف على الأقل"
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
            {busy ? <Loader2 className="size-4 animate-spin" /> : "حفظ المدرس"}
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
