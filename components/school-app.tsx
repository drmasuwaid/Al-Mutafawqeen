"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { LandingView } from "@/components/landing-view";
import { PrincipalDashboard } from "@/components/principal-dashboard";
import { StudentBoard } from "@/components/student-board";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useHomeworkLive } from "@/hooks/use-homework-live";

export function SchoolApp() {
  const { profile, loading } = useAuth();
  const live = useHomeworkLive(profile);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | null = null;
    const onVisible = () => {
      if (document.visibilityState === "visible") void registration?.update();
    };
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((next) => {
        registration = next;
        void next.update();
      })
      .catch(() => {
        /* optional PWA cache */
      });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[#f4f6f8]">
        <Loader2 className="size-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!profile) return <LandingView />;

  if (profile.role === "student") {
    return (
      <StudentBoard snapshot={live.snapshot} error={live.error} onRetry={live.reload} />
    );
  }

  if (profile.role === "admin") {
    return <PrincipalDashboard />;
  }

  return (
    <TeacherDashboard
      snapshot={live.snapshot}
      error={live.error}
      onRetry={live.reload}
      onPublished={live.reload}
    />
  );
}
