"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";
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
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const nextPassword = newPassword.trim();
    if (nextPassword && nextPassword !== newPasswordConfirm.trim()) {
      toast.error("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameAr,
          username,
          currentPassword,
          newPassword: nextPassword || undefined,
          newPasswordConfirm: nextPassword ? newPasswordConfirm.trim() : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        profile?: Profile;
        passwordChanged?: boolean;
      };
      if (!res.ok || !data.profile) throw new Error(data.error);
      onSaved(data.profile);
      onOpenChange(false);
      toast.success(
        data.passwordChanged
          ? "تم حفظ كلمة المرور الجديدة. استخدمها في الدخول التالي."
          : "تم تحديث معلومات الحساب."
      );
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
          setNewPasswordConfirm("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto text-right" dir="rtl" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 flex size-10 items-center justify-center text-slate-400"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>
        <DialogTitle className="text-xl font-extrabold">تغيير معلومات الحساب</DialogTitle>
        <DialogDescription>
          أدخل كلمة المرور الحالية للتأكيد، ثم حدّث الاسم أو اسم المستخدم أو كلمة المرور. أعد كتابة
          كلمة المرور الجديدة للتأكد من عدم وجود خطأ مطبعي.
        </DialogDescription>
        <label className="block space-y-2 text-right">
          <span className="block text-sm font-medium text-slate-600">الاسم:</span>
          <input dir="rtl" className="field-input rtl-field w-full" value={displayNameAr} onChange={(event) => setDisplayNameAr(event.target.value)} />
        </label>
        <label className="block space-y-2 text-right">
          <span className="block text-sm font-medium text-slate-600">اسم المستخدم:</span>
          <input
            dir="rtl"
            className="field-input rtl-field w-full"
            value={username}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-right">
          <span className="block text-sm font-medium text-slate-600">كلمة المرور الحالية:</span>
          <PasswordInput
            key={open ? "current" : "current-closed"}
            value={currentPassword}
            autoComplete="current-password"
            onChange={setCurrentPassword}
          />
        </label>
        <label className="block space-y-2 text-right">
          <span className="block text-sm font-medium text-slate-600">كلمة المرور الجديدة (اختياري):</span>
          <PasswordInput
            key={open ? "new" : "new-closed"}
            value={newPassword}
            autoComplete="new-password"
            onChange={setNewPassword}
          />
        </label>
        {newPassword.trim() ? (
          <label className="block space-y-2 text-right">
            <span className="block text-sm font-medium text-slate-600">تأكيد كلمة المرور الجديدة:</span>
            <PasswordInput
              key={open ? "confirm" : "confirm-closed"}
              value={newPasswordConfirm}
              autoComplete="new-password"
              onChange={setNewPasswordConfirm}
            />
          </label>
        ) : null}
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
