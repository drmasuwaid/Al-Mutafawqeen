"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveSnapshot, Profile } from "@/lib/types";

export type SyncState = "live" | "reconnecting" | "offline" | "error";

function cacheKey(uid: string) {
  return `stf-snapshot-${uid}`;
}

function newerThan(next: LiveSnapshot, current: LiveSnapshot | null) {
  if (!current) return true;
  if (next.serverTime > current.serverTime) return true;
  if (next.homework.length !== current.homework.length) return true;
  const prev = new Map(current.homework.map((item) => [item.id, item.updatedAt]));
  return next.homework.some((item) => prev.get(item.id) !== item.updatedAt);
}

export function useHomeworkLive(profile: Profile | null) {
  const enabled = Boolean(profile);
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [state, setState] = useState<SyncState>("reconnecting");
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);
  const snapshotRef = useRef<LiveSnapshot | null>(null);

  useEffect(() => {
    snapshotRef.current = null;
    setSnapshot(null);
    setError(null);
    setState("reconnecting");
    if (!profile) return;
    try {
      const cached = localStorage.getItem(cacheKey(profile.uid));
      if (cached) {
        const data = JSON.parse(cached) as LiveSnapshot;
        snapshotRef.current = data;
        setSnapshot(data);
      }
    } catch {
      /* ignore */
    }
  }, [profile?.uid]);

  useEffect(() => {
    if (!enabled || !profile) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let pollTimer: number | undefined;

    const persist = (data: LiveSnapshot, force = false) => {
      if (!force && !newerThan(data, snapshotRef.current)) return;
      snapshotRef.current = data;
      setSnapshot(data);
      try {
        localStorage.setItem(cacheKey(profile.uid), JSON.stringify(data));
      } catch {
        /* quota */
      }
    };

    const loadOnce = async (force = false) => {
      const res = await fetch("/api/homework", { cache: "no-store" });
      if (res.status === 401) {
        snapshotRef.current = null;
        setSnapshot(null);
        throw new Error("انتهت الجلسة. أعد تسجيل الدخول.");
      }
      if (!res.ok) throw new Error("Could not load homework");
      const data = (await res.json()) as LiveSnapshot;
      if (!cancelled) {
        persist(data, force);
        setError(null);
      }
    };

    const connect = async () => {
      try {
        await loadOnce(true);
        if (cancelled) return;
        setState(navigator.onLine ? "live" : "offline");
        sourceRef.current?.close();
        const source = new EventSource("/api/homework/stream");
        sourceRef.current = source;
        const onSnapshotEvent = (event: Event) => {
          const data = JSON.parse((event as MessageEvent).data) as LiveSnapshot;
          persist(data, true);
          setState("live");
          setError(null);
        };
        source.addEventListener("snapshot", onSnapshotEvent);
        source.addEventListener("update", () => {
          void loadOnce(true);
        });
        source.addEventListener("insert", () => {
          void loadOnce(true);
        });
        source.addEventListener("delete", () => {
          void loadOnce(true);
        });
        source.addEventListener("change", () => {
          void loadOnce(true);
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
    pollTimer = window.setInterval(() => {
      if (cancelled || document.hidden) return;
      void loadOnce(false);
    }, 4000);

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (pollTimer) window.clearInterval(pollTimer);
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
