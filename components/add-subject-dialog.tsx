"use client";

import { useEffect, useState } from "react";
import { BookPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubjects } from "@/hooks/use-subjects";

export function AddSubjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addSubject } = useSubjects();
  const [nameAr, setNameAr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setNameAr("");
  }, [open]);

  async function submit() {
    const next = nameAr.trim();
    if (!next) {
      toast.error("أدخل اسم المادة.");
      return;
    }
    setBusy(true);
    try {
      const result = await addSubject(next);
      toast.success(
        result.existing
          ? `المادة «${result.subject.nameAr}» موجودة مسبقاً في القوائم.`
          : `تمت إضافة «${result.subject.nameAr}». ستظهر فوراً في قوائم المواد.`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة المادة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 text-right sm:max-w-[420px]" dir="rtl" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 flex size-10 items-center justify-center text-slate-400 hover:text-slate-600"
          onClick={() => onOpenChange(false)}
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3 pt-1">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BookPlus className="size-5" />
          </span>
          <div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              إضافة مادة دراسية جديدة
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-400">
              تُضاف إلى قائمة المواد وتظهر مباشرة عند إنشاء أو تعديل المدرسين ونشر الواجبات.
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
            <span className="block text-sm font-medium text-slate-600">اسم المادة</span>
            <input
              dir="rtl"
              className="field-input rtl-field w-full"
              placeholder="أدخل اسم المادة الجديدة..."
              value={nameAr}
              autoComplete="off"
              autoFocus
              onChange={(event) => setNameAr(event.target.value)}
            />
          </label>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#3b82f6] text-sm font-bold text-white hover:bg-[#2563eb] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "إضافة"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              إلغاء
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
