"use client";

import { useState } from "react";
import { Loader2, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

export function TeacherLoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("ahmed");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await signIn(username, password);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل تسجيل الدخول");
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
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Lock className="size-5" />
          </span>
          <div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              تسجيل دخول المدرس
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-400">
              لوحة تحكم الكادر التدريسي
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
            <span className="block text-sm font-medium text-slate-600">اسم المستخدم:</span>
            <input
              dir="rtl"
              className="field-input rtl-field w-full"
              placeholder="أدخل اسم المستخدم"
              value={username}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="block space-y-2 text-right">
            <span className="block text-sm font-medium text-slate-600">كلمة المرور:</span>
            <PasswordInput
              key={open ? "open" : "closed"}
              placeholder="أدخل كلمة المرور"
              value={password}
              autoComplete="current-password"
              onChange={setPassword}
            />
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#5b4fd6] text-sm font-bold text-white shadow-sm shadow-violet-500/20 transition hover:bg-[#4f46c8] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "دخول للنظام"}
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
