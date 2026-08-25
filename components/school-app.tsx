"use client";

import { useState } from "react";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignForm } from "@/components/assign-form";
import { HomeworkBoard } from "@/components/homework-board";
import { LoginView } from "@/components/login-view";
import { ProgressPanel } from "@/components/progress-panel";
import { SyncIndicator } from "@/components/sync-indicator";
import { useAuth } from "@/hooks/use-auth";
import { useHomeworkLive } from "@/hooks/use-homework-live";
import { useLocale } from "@/hooks/use-locale";
import type { DueBucket } from "@/lib/types";

export function SchoolApp() {
  const { profile, loading, signOut } = useAuth();
  const { t, locale, toggle } = useLocale();
  const live = useHomeworkLive(Boolean(profile));
  const [filter, setFilter] = useState<DueBucket | "all">("all");
  const [tab, setTab] = useState("homework");

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-teal-50">
        <Loader2 className="size-6 animate-spin text-teal-800" />
      </div>
    );
  }

  if (!profile) return <LoginView />;

  const canAssign = profile.role === "admin" || profile.role === "teacher";
  const snapshot = live.snapshot;
  const displayName = locale === "ar" ? profile.displayNameAr : profile.displayName;
  const roleLabel = t[profile.role];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,_oklch(0.97_0.02_165),_oklch(0.96_0.01_80)_28%,_oklch(0.97_0.01_165))]">
      <header className="sticky top-0 z-20 border-b border-teal-900/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-800 text-white shadow-sm">
              <BookOpenCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-teal-950">{t.school}</p>
              <p className="text-xs text-muted-foreground">{t.product}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SyncIndicator state={live.state} serverTime={snapshot?.serverTime} />
            <Button variant="ghost" size="sm" onClick={toggle}>
              {t.language}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              {t.signOut}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="rounded-2xl bg-teal-900 px-5 py-5 text-teal-50 shadow-lg shadow-teal-900/10">
          <p className="text-sm text-teal-100/80">{t.welcome}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {displayName}
            <span className="ms-2 text-base font-normal text-teal-100/80">{roleLabel}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50/80">{t.boardIntro}</p>
        </section>

        {live.error ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{t.loadError}</span>
            <Button variant="outline" size="sm" onClick={live.reload}>
              {t.retry}
            </Button>
          </div>
        ) : null}

        {!snapshot ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-teal-800" />
          </div>
        ) : canAssign ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full max-w-md">
              <TabsTrigger value="homework">{t.homework}</TabsTrigger>
              <TabsTrigger value="assign">{t.assign}</TabsTrigger>
              <TabsTrigger value="progress">{t.progress}</TabsTrigger>
            </TabsList>
            <TabsContent value="homework">
              <HomeworkBoard
                profile={profile}
                homework={snapshot.homework}
                classes={snapshot.classes}
                subjects={snapshot.subjects}
                filter={filter}
                onFilter={setFilter}
              />
            </TabsContent>
            <TabsContent value="assign">
              <div className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
                <AssignForm
                  profile={profile}
                  classes={snapshot.classes}
                  subjects={snapshot.subjects}
                />
              </div>
            </TabsContent>
            <TabsContent value="progress">
              <ProgressPanel
                homework={snapshot.homework}
                classes={snapshot.classes}
                subjects={snapshot.subjects}
                students={snapshot.students}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <HomeworkBoard
            profile={profile}
            homework={snapshot.homework}
            classes={snapshot.classes}
            subjects={snapshot.subjects}
            filter={filter}
            onFilter={setFilter}
          />
        )}
      </main>
    </div>
  );
}
