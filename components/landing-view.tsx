"use client";

import { GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StudentLoginDialog } from "@/components/student-login-dialog";
import { StaffAccessDialog } from "@/components/staff-access-dialog";
import { useState } from "react";

export function LandingView() {
  const [studentOpen, setStudentOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f6f8]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 sm:px-6">
        <AppHeader />

        <section className="soft-card mx-auto mt-2 w-full max-w-3xl px-6 py-10 text-center sm:px-12">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
            المنصة الذكية المتكاملة
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-slate-900 sm:text-4xl">
            مرحباً بك في منصة الواجبات
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
            تابع الواجبات والملاحظات اليومية لحظة بلحظة، مع إمكانية التصفح دون اتصال
            بالإنترنت ومزامنة فورية عند عودة الشبكة.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <RoleCard
            icon={<GraduationCap className="size-6" />}
            title="واجهة الطلاب"
            body="اختر الصف والشعبة لاستعراض الواجبات اليومية والمرفقات مباشرة، دون الحاجة إلى كلمة مرور."
            action="الدخول لصفحة الواجبات ←"
            badge="قراءة فقط"
            badgeClass="bg-sky-50 text-sky-700"
            onClick={() => setStudentOpen(true)}
          />
          <RoleCard
            icon={<Presentation className="size-6" />}
            title="واجهة الكادر الإداري والتدريسي"
            body="دخول مدير المدرسة لإدارة المدرسين، أو دخول المدرس بعد اختيار اسمه من القائمة الأبجدية."
            action="الدخول إلى البوابة ←"
            badge="إدارة وتدريس"
            badgeClass="bg-violet-50 text-violet-700"
            onClick={() => setTeacherOpen(true)}
          />
        </section>

        <aside className="mt-6 flex flex-col items-start gap-4 rounded-[22px] bg-emerald-50 px-4 py-4 ring-1 ring-emerald-100 sm:flex-row sm:items-center sm:px-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-bold text-emerald-900">
              معمارية متطورة للعمل دون إنترنت (Offline-First)
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800/80">
              يمكنك تصفح الواجبات ونشرها وأنت غير متصل، وستُزامَن تلقائياً عند عودة الاتصال.
            </p>
          </div>
        </aside>
      </div>

      <StudentLoginDialog open={studentOpen} onOpenChange={setStudentOpen} />
      <StaffAccessDialog open={teacherOpen} onOpenChange={setTeacherOpen} />
    </div>
  );
}

function RoleCard({
  icon,
  title,
  body,
  action,
  badge,
  badgeClass,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
  badge: string;
  badgeClass: string;
  onClick: () => void;
}) {
  return (
    <article className="soft-card flex flex-col p-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#3b82f6] text-white">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-7 text-slate-500">{body}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClick}
          className="text-sm font-bold text-[#3b82f6] hover:text-[#2563eb]"
        >
          {action}
        </button>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>
          {badge}
        </span>
      </div>
    </article>
  );
}
