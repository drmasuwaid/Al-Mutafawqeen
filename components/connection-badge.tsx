"use client";

import { cn } from "@/lib/utils";
import { useOnline } from "@/hooks/use-online";
import type { SyncState } from "@/hooks/use-homework-live";

export function ConnectionBadge({
  className,
  syncState,
}: {
  className?: string;
  syncState?: SyncState;
}) {
  const online = useOnline();
  const state = !online ? "offline" : syncState ?? "live";
  const live = state === "live";
  const label =
    state === "live"
      ? "متصل (Online)"
      : state === "reconnecting"
        ? "جارٍ إعادة الاتصال"
        : state === "error"
          ? "تعذر التزامن"
          : "غير متصل (Offline)";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
        live
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : state === "reconnecting"
            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
            : state === "error"
              ? "bg-red-50 text-red-700 ring-1 ring-red-100"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        className
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          live ? "bg-emerald-500" : state === "reconnecting" ? "bg-amber-500" : state === "error" ? "bg-red-500" : "bg-slate-400"
        )}
      />
      {label}
    </span>
  );
}
