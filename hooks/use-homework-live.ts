"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveSnapshot, Profile } from "@/lib/types";

export type SyncState = "live" | "reconnecting" | "offline" | "error";

function cacheKey(uid: string) {
  return `stf-snapshot-${uid}`;
}

export function useHomeworkLive(profile: Profile | null) {
  const enabled = Boolean(profile);
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [state, setState] = useState<SyncState>("reconnecting");
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!profile) return;
    try {
      const cached = localStorage.getItem(cacheKey(profile.uid));
      if (cached) {
        setSnapshot(JSON.parse(cached) as LiveSnapshot);
      }
    } catch {
      /* ignore */
    }
  }, [profile]);

  useEffect(() => {
    if (!enabled || !profile) return;

    let cancelled = false;
    let retryTimer: number | undefined;

    const persist = (data: LiveSnapshot) => {
      setSnapshot(data);
      try {
        localStorage.setItem(cacheKey(profile.uid), JSON.stringify(data));
      } catch {
        /* quota */
      }
    };

    const loadOnce = async () => {
      const res = await fetch("/api/homework", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load homework");
      const data = (await res.json()) as LiveSnapshot;
      if (!cancelled) {
        persist(data);
        setError(null);
      }
    };

    const connect = async () => {
      try {
        await loadOnce();
        if (cancelled) return;
        setState(navigator.onLine ? "live" : "offline");
        const source = new EventSource("/api/homework/stream");
        sourceRef.current = source;
        source.addEventListener("snapshot", (event) => {
          const data = JSON.parse((event as MessageEvent).data) as LiveSnapshot;
          persist(data);
          setState("live");
          setError(null);
        });
        source.addEventListener("sync-error", (event) => {
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
          if (source.readyState === EventSource.CLOSED) {
            setState(navigator.onLine ? "reconnecting" : "offline");
            if (!cancelled) {
              retryTimer = window.setTimeout(() => {
                void connect();
              }, 1500);
            }
          }
        };
      } catch (err) {
        setState(navigator.onLine ? "error" : "offline");
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
  }, [enabled, tick, profile]);

  return {
    snapshot,
    state,
    error,
    reload: () => setTick((value) => value + 1),
  };
}
