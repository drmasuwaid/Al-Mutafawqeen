"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { GRADES, SECTIONS } from "@/lib/catalog";
import { useAuth } from "@/hooks/use-auth";

export function StudentLoginDialog({
  open,
  onOpenChange,
  initialGradeId,
  initialSectionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGradeId?: string;
  initialSectionId?: string;
}) {
  const { enterStudent } = useAuth();
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGradeId(initialGradeId ?? "");
    setSectionId(initialSectionId ?? "");
  }, [open, initialGradeId, initialSectionId]);

  async function submit() {
    if (!gradeId || !sectionId) {
      toast.error("يرجى اختيار الصف والشعبة.");
      return;
    }
    setBusy(true);
    try {
      await enterStudent(gradeId, sectionId);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 text-right sm:max-w-[440px]" dir="rtl" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 text-slate-400 transition hover:text-slate-600"
          onClick={() => onOpenChange(false)}
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3 pt-1">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <GraduationCap className="size-6" />
          </span>
          <div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              دخول واجهة الطلاب
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-400">
              استعراض الواجبات المدرسية المباشرة
            </DialogDescription>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-2 text-right">
            <span className="block text-sm font-medium text-slate-600">
              المرحلة الدراسية / الصف:
            </span>
            <NativeSelect
              dir="rtl"
              value={gradeId}
              onChange={(event) => {
                setGradeId(event.target.value);
                setSectionId("");
              }}
            >
              <option value="">-- اختر الصف الدراسي --</option>
              {GRADES.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.nameAr}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className="block space-y-2 text-right">
            <span className="block text-sm font-medium text-slate-600">الشعبة:</span>
            <NativeSelect
              dir="rtl"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
            >
              <option value="">-- اختر الشعبة --</option>
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  شعبة {section.ar}
                </option>
              ))}
            </NativeSelect>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#3b82f6] text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#2563eb] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "دخول واستعراض الواجبات"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              إلغاء
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
