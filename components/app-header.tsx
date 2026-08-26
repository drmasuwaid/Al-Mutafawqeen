"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import { ConnectionBadge } from "@/components/connection-badge";

export function AppHeader({
  onBack,
}: {
  onBack?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="العودة"
          >
            <ChevronRight className="size-5" />
          </button>
        ) : null}
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#3b82f6] text-white shadow-sm shadow-blue-500/30">
          <BookOpen className="size-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold text-[#2563eb] sm:text-lg">
            الواجبات المدرسية
          </h1>
        </div>
      </div>
      <ConnectionBadge />
    </header>
  );
}
