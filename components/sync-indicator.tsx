"use client";

import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import type { SyncState } from "@/hooks/use-homework-live";
import { formatClock } from "@/lib/dates";
import { Radio } from "lucide-react";

export function SyncIndicator({
  state,
  serverTime,
}: {
  state: SyncState;
  serverTime?: string;
}) {
  const { t, locale } = useLocale();
  const label =
    state === "live" ? t.live : state === "offline" ? t.offline : t.reconnecting;
  const tone =
    state === "live"
      ? "bg-emerald-600/15 text-emerald-800 border-emerald-600/20"
      : state === "error" || state === "offline"
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : "bg-amber-500/15 text-amber-800 border-amber-500/20";

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={tone}>
        <Radio className={state === "live" ? "size-3.5 animate-pulse" : "size-3.5"} />
        {label}
      </Badge>
      {serverTime ? (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t.lastSync} {formatClock(serverTime, locale)}
        </span>
      ) : null}
    </div>
  );
}
