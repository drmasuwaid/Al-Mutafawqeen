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
import type { Profile } from "@/lib/types";

export function AccountDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSaved: (profile: Profile) => void;
}) {
  const [displayNameAr, setDisplayNameAr] = useState(profile.displayNameAr);
  const [username, setUsername] = useState(profile.username ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayNameAr, username }),
      });
      const data = (await res.json()) as { error?: string; profile?: Profile };
      if (!res.ok || !data.profile) throw new Error(data.error);
      onSaved(data.profile);
      onOpenChange(false);
      toast.success("تم تحديث معلومات الحساب.");
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
        if (next) {
          setDisplayNameAr(profile.displayNameAr);
          setUsername(profile.username ?? "");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>
        <DialogTitle className="text-xl font-extrabold">تغيير معلومات الحساب</DialogTitle>
        <DialogDescription>حدّث الاسم الظاهر واسم المستخدم للوحة المدرس.</DialogDescription>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">الاسم الظاهر:</span>
          <input
            className="field-input w-full"
            value={displayNameAr}
            onChange={(event) => setDisplayNameAr(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">اسم المستخدم:</span>
          <input
            className="field-input w-full"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-[#3b82f6] font-bold text-white"
          >
            حفظ
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
