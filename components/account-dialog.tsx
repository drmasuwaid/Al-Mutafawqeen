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
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
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
        <PasswordField
          label="كلمة المرور الحالية:"
          value={currentPassword}
          shown={showCurrent}
          autoComplete="current-password"
          onToggle={() => setShowCurrent((value) => !value)}
          onChange={setCurrentPassword}
        />
        <PasswordField
          label="كلمة المرور الجديدة (اختياري):"
          value={newPassword}
          shown={showNew}
          autoComplete="new-password"
          onToggle={() => setShowNew((value) => !value)}
          onChange={setNewPassword}
        />
        {newPassword.trim() ? (
          <PasswordField
            label="تأكيد كلمة المرور الجديدة:"
            value={newPasswordConfirm}
            shown={showNew}
            autoComplete="new-password"
            onToggle={() => setShowNew((value) => !value)}
            onChange={setNewPasswordConfirm}
          />
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

function PasswordField({
  label,
  value,
  shown,
  autoComplete,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  shown: boolean;
  autoComplete: string;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-right">
      <span className="block text-sm font-medium text-slate-600">{label}</span>
      <div className="relative">
        <input
          dir="rtl"
          className="field-input rtl-field w-full pe-11"
          type={shown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" onClick={onToggle}>
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );
}
