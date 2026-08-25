"use client";

import { cn } from "@/lib/utils";
import { useOnline } from "@/hooks/use-online";

export function ConnectionBadge({ className }: { className?: string }) {
  const online = useOnline();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
        online
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        className
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          online ? "bg-emerald-500" : "bg-slate-400"
        )}
      />
      {online ? "متصل (Online)" : "غير متصل (Offline)"}
    </span>
  );
}
