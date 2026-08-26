"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronRight, Eye, EyeOff, Loader2, Lock, Presentation, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { useAuth } from "@/hooks/use-auth";
import type { TeacherSummary } from "@/lib/types";

type Step = "role" | "principal" | "teacher";

export function StaffAccessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>("role");
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("role");
      setTeacherId("");
      setUsername("");
      setPassword("");
      setShowPassword(false);
      return;
    }
    setLoadingTeachers(true);
    fetch("/api/teachers")
      .then(async (res) => {
        const data = (await res.json()) as { teachers?: TeacherSummary[] };
        setTeachers(data.teachers ?? []);
      })
      .catch(() => setTeachers([]))
      .finally(() => setLoadingTeachers(false));
  }, [open]);

  const selectedTeacher = teachers.find((item) => item.id === teacherId) ?? null;

  async function submitPrincipal() {
    setBusy(true);
    try {
      await signIn(username, password, { role: "admin" });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  async function submitTeacher() {
    if (!teacherId) {
      toast.error("اختر اسم المدرس من القائمة أولاً.");
      return;
    }
    setBusy(true);
    try {
      await signIn(username, password, { role: "teacher", teacherId });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[480px]" showCloseButton={false}>
        <button
          type="button"
          className="absolute top-4 left-4 text-slate-400 transition hover:text-slate-600"
          onClick={() => onOpenChange(false)}
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>

        {step !== "role" ? (
          <button
            type="button"
            className="absolute top-4 right-4 flex size-10 items-center justify-center text-slate-400 hover:text-slate-600"
            onClick={() => {
              setStep("role");
              setPassword("");
            }}
            aria-label="رجوع"
          >
            <ChevronRight className="size-4" />
          </button>
        ) : null}

        {step === "role" ? (
          <>
            <div className="pt-1">
              <DialogTitle className="text-xl font-extrabold text-slate-900">
                واجهة الكادر الإداري والتدريسي
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-400">
                اختر صفة الدخول للمتابعة.
              </DialogDescription>
            </div>
            <div className="grid gap-3">
              <RoleChoice
                icon={<Building2 className="size-5" />}
                title="مدير المدرسة"
                body="إدارة المدرسين وإضافة حسابات جديدة للهيئة التدريسية."
                onClick={() => {
                  setUsername("");
                  setPassword("");
                  setStep("principal");
                }}
              />
              <RoleChoice
                icon={<Presentation className="size-5" />}
                title="مدرس"
                body="اختر اسمك من القائمة ثم أدخل بيانات الدخول لنشر الواجبات."
                onClick={() => {
                  setUsername("");
                  setPassword("");
                  setStep("teacher");
                }}
              />
            </div>
          </>
        ) : null}

        {step === "principal" ? (
          <>
            <Header icon={<Building2 className="size-5" />} title="تسجيل دخول مدير المدرسة" subtitle="لوحة إدارة الكادر التدريسي" />
            <CredentialForm
              username={username}
              password={password}
              showPassword={showPassword}
              busy={busy}
              onUsername={setUsername}
              onPassword={setPassword}
              onTogglePassword={() => setShowPassword((value) => !value)}
              onSubmit={() => void submitPrincipal()}
              onCancel={() => onOpenChange(false)}
            />
          </>
        ) : null}

        {step === "teacher" ? (
          <>
            <Header icon={<Lock className="size-5" />} title="تسجيل دخول المدرس" subtitle="اختر اسمك أبجدياً ثم أكّد بيانات الدخول" />
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-600">اسم المدرس (أ - ي):</span>
              <NativeSelect
                value={teacherId}
                disabled={loadingTeachers}
                onChange={(event) => {
                  const id = event.target.value;
                  setTeacherId(id);
                  const next = teachers.find((item) => item.id === id);
                  setUsername(next?.username ?? "");
                  setPassword("");
                }}
              >
                <option value="">{loadingTeachers ? "جاري تحميل الأسماء..." : "-- اختر اسم المدرس --"}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.displayNameAr}
                  </option>
                ))}
              </NativeSelect>
              {!loadingTeachers && teachers.length === 0 ? (
                <p className="text-xs text-slate-400">لا يوجد مدرسون مسجلون بعد. يضيفهم مدير المدرسة من بوابته.</p>
              ) : null}
            </div>
            {selectedTeacher ? (
              <CredentialForm
                username={username}
                password={password}
                showPassword={showPassword}
                busy={busy}
                onUsername={setUsername}
                onPassword={setPassword}
                onTogglePassword={() => setShowPassword((value) => !value)}
                onSubmit={() => void submitTeacher()}
                onCancel={() => onOpenChange(false)}
              />
            ) : (
              <p className="text-sm text-slate-400">بعد اختيار الاسم ستظهر حقول اسم المستخدم وكلمة المرور.</p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Header({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 pt-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        {icon}
      </span>
      <div>
        <DialogTitle className="text-xl font-extrabold text-slate-900">{title}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate-400">{subtitle}</DialogDescription>
      </div>
    </div>
  );
}

function RoleChoice({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right transition hover:border-blue-300 hover:bg-blue-50/50"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#3b82f6] text-white">
        {icon}
      </span>
      <span>
        <span className="block text-base font-extrabold text-slate-900">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-500">{body}</span>
      </span>
    </button>
  );
}

function CredentialForm({
  username,
  password,
  showPassword,
  busy,
  onUsername,
  onPassword,
  onTogglePassword,
  onSubmit,
  onCancel,
}: {
  username: string;
  password: string;
  showPassword: boolean;
  busy: boolean;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-600">اسم المستخدم:</span>
            <input
              className="field-input ltr-field w-full"
              placeholder="أدخل اسم المستخدم"
              value={username}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => onUsername(event.target.value)}
            />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-600">كلمة المرور:</span>
        <div className="relative">
          <input
            className="field-input ltr-field w-full ps-11"
            type={showPassword ? "text" : "password"}
            placeholder="أدخل كلمة المرور"
            value={password}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => onPassword(event.target.value)}
          />
          <button
            type="button"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={onTogglePassword}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
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
          onClick={onCancel}
          className="h-12 rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
