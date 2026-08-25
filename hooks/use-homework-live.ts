"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveSnapshot } from "@/lib/types";

export type SyncState = "live" | "reconnecting" | "offline" | "error";

export function useHomeworkLive(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [state, setState] = useState<SyncState>("reconnecting");
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retryTimer: number | undefined;

    const loadOnce = async () => {
      const res = await fetch("/api/homework", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load homework");
      const data = (await res.json()) as LiveSnapshot;
      if (!cancelled) {
        setSnapshot(data);
        setError(null);
      }
    };

    const connect = async () => {
      try {
        await loadOnce();
        if (cancelled) return;
        setState("live");
        const source = new EventSource("/api/homework/stream");
        sourceRef.current = source;
        source.addEventListener("snapshot", (event) => {
          const data = JSON.parse((event as MessageEvent).data) as LiveSnapshot;
          setSnapshot(data);
          setState("live");
          setError(null);
        });
        source.addEventListener("error", (event) => {
          const messageEvent = event as MessageEvent;
          if (typeof messageEvent.data === "string") {
            try {
              const payload = JSON.parse(messageEvent.data) as { message?: string };
              setError(payload.message ?? "Live sync error");
            } catch {
              setError("Live sync error");
            }
          }
        });
        source.onerror = () => {
          setState("reconnecting");
          source.close();
          if (!cancelled) {
            retryTimer = window.setTimeout(() => {
              void connect();
            }, 1500);
          }
        };
      } catch (err) {
        setState("error");
        setError(err instanceof Error ? err.message : "Live sync error");
        if (!cancelled) {
          retryTimer = window.setTimeout(() => {
            void connect();
          }, 2500);
        }
      }
    };

    void connect();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      sourceRef.current?.close();
    };
  }, [enabled, tick]);

  return {
    snapshot,
    state,
    error,
    reload: () => setTick((value) => value + 1),
  };
}
