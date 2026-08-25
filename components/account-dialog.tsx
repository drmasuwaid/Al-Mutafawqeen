"use client";

import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameAr,
          username,
          currentPassword,
          newPassword: newPassword.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; profile?: Profile };
      if (!res.ok || !data.profile) throw new Error(data.error);
      onSaved(data.profile);
      onOpenChange(false);
      toast.success("تم تحديث الحساب المرتبط بمعرّفك الثابت.");
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
          setCurrentPassword("");
          setNewPassword("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 flex size-10 items-center justify-center text-slate-400"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>
        <DialogTitle className="text-xl font-extrabold">تغيير معلومات الحساب</DialogTitle>
        <DialogDescription>
          التعديل يحدّث سجل المدرس ذي المعرّف الثابت فقط، دون إنشاء حساب جديد.
        </DialogDescription>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          المعرّف الثابت: {profile.teacherId || profile.uid}
        </p>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">الاسم:</span>
          <input className="field-input w-full" value={displayNameAr} onChange={(event) => setDisplayNameAr(event.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">اسم المستخدم:</span>
          <input className="field-input w-full" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">كلمة المرور الحالية:</span>
          <div className="relative">
            <input
              className="field-input w-full ps-11"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <button type="button" className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" onClick={() => setShowCurrent((value) => !value)}>
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">كلمة المرور الجديدة (اختياري):</span>
          <div className="relative">
            <input
              className="field-input w-full ps-11"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <button type="button" className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" onClick={() => setShowNew((value) => !value)}>
              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => void save()} disabled={busy} className="h-12 flex-1 rounded-xl bg-[#3b82f6] font-bold text-white">
            حفظ
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-12 rounded-xl bg-slate-100 px-5 font-semibold text-slate-600">
            إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
