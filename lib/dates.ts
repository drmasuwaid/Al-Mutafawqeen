import type { DueBucket } from "@/lib/types";

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dueBucket(dueAt: string | null, now = new Date()): DueBucket | null {
  if (!dueAt) return null;
  const dueDay = startOfDay(new Date(dueAt));
  const today = startOfDay(now);
  if (dueDay < today) return "overdue";
  if (dueDay.getTime() === today.getTime()) return "today";
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 3);
  if (dueDay <= soon) return "soon";
  return "upcoming";
}

export function formatDue(dueAt: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dueAt));
}

export function formatDueDay(dueAt: string) {
  const date = new Date(dueAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatPublishedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const period = hours24 >= 12 ? "م" : "ص";
  return `${ymd} • ${hours12}:${pad(date.getMinutes())} ${period}`;
}

export function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isFresh(createdAt: string, withinMs = 120_000) {
  return Date.now() - new Date(createdAt).getTime() < withinMs;
}

export function formatClock(value: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
