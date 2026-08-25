"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GRADES, SECTIONS, classIdFor } from "@/lib/catalog";
import type { Profile } from "@/lib/types";

export function StagesDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSaved: (classIds: string[]) => void;
}) {
  const [classIds, setClassIds] = useState(profile.classIds ?? []);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setClassIds((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id]
    );
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classIds }),
      });
      const data = (await res.json()) as { error?: string; profile?: Profile };
      if (!res.ok) throw new Error(data.error);
      onSaved(classIds);
      onOpenChange(false);
      toast.success("تم حفظ المراحل والشعب.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setClassIds(profile.classIds ?? []);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>
        <DialogTitle className="text-xl font-extrabold">إضافة / تعديل المراحل</DialogTitle>
        <DialogDescription>
          حدّد الصفوف والشعب المسندة إليك ليظهروا في لوحة النشر.
        </DialogDescription>
        <div className="space-y-4">
          {GRADES.map((grade) => (
            <div key={grade.id} className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-2 font-bold text-slate-800">{grade.nameAr}</p>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((section) => {
                  const id = classIdFor(grade.id, section.id);
                  const checked = classIds.includes(id);
                  return (
                    <label
                      key={id}
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${
                        checked ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggle(id)}
                      />
                      شعبة {section.ar}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-[#3b82f6] font-bold text-white"
          >
            حفظ المراحل
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl bg-slate-100 px-5 font-semibold text-slate-600"
          >
            إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
