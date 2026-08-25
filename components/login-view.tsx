"use client";

import { useState } from "react";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";

const DEMO = [
  {
    roleKey: "admin" as const,
    email: "noura.admin@mutafawqeen.school",
    nameEn: "Noura Abdelqader",
    nameAr: "نورة عبد القادر",
  },
  {
    roleKey: "teacher" as const,
    email: "layla.arabic@mutafawqeen.school",
    nameEn: "Layla Al-Khazraji · Arabic",
    nameAr: "ليلى الخزرجي · العربية",
  },
  {
    roleKey: "student" as const,
    email: "ahmed.g4a@mutafawqeen.school",
    nameEn: "Ahmed Mohammed · 4th Sci. A",
    nameAr: "أحمد محمد · الرابع العلمي أ",
  },
];

export function LoginView() {
  const { signIn } = useAuth();
  const { t, locale, toggle } = useLocale();
  const [email, setEmail] = useState(DEMO[1].email);
  const [password, setPassword] = useState("LiveSync2026");
  const [busy, setBusy] = useState(false);

  async function submit(nextEmail = email, nextPassword = password) {
    setBusy(true);
    try {
      await signIn(nextEmail, nextPassword);
    } catch {
      toast.error(t.loginError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[radial-gradient(circle_at_top,_oklch(0.93_0.04_165),_transparent_36%),linear-gradient(180deg,_oklch(0.97_0.02_165),_oklch(0.94_0.03_80))]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-teal-950">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal-800 text-white shadow-sm">
            <BookOpenCheck className="size-5" />
          </span>
          {t.school}
        </div>
        <Button variant="ghost" onClick={toggle}>
          {t.language}
        </Button>
      </div>

      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold tracking-wide text-teal-800 uppercase">
            Firebase live sync
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-teal-950 sm:text-5xl">
            {t.product}
          </h1>
          <p className="max-w-lg text-base leading-7 text-teal-950/70">{t.tagline}</p>
          <p className="max-w-lg text-sm leading-6 text-teal-900/60">{t.boardIntro}</p>
        </div>

        <Card className="border-0 bg-white/85 shadow-xl shadow-teal-900/5 ring-teal-900/5 backdrop-blur">
          <CardHeader>
            <CardTitle>{t.signIn}</CardTitle>
            <CardDescription>{t.demoAccounts}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="username"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t.password}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full bg-teal-800 text-white hover:bg-teal-800/90" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                {busy ? t.signingIn : t.signIn}
              </Button>
            </form>

            <div className="grid gap-2">
              {DEMO.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="flex items-center justify-between rounded-lg border border-teal-900/10 bg-teal-50/70 px-3 py-2 text-start text-sm transition hover:bg-teal-100/80"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("LiveSync2026");
                    void submit(account.email, "LiveSync2026");
                  }}
                >
                  <span className="font-medium text-teal-950">
                    {locale === "ar" ? account.nameAr : account.nameEn}
                  </span>
                  <span className="text-xs text-teal-800/70">{t[account.roleKey]}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
