"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { arabicMatches } from "@/lib/arabic";
import type { TeacherSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TeacherNameCombobox({
  teachers,
  value,
  onChange,
  disabled,
  loading,
}: {
  teachers: TeacherSummary[];
  value: string;
  onChange: (teacher: TeacherSummary | null) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = teachers.find((item) => item.id === value) ?? null;
  const matches = useMemo(() => {
    return teachers.filter((teacher) => arabicMatches(teacher.displayNameAr, query));
  }, [teachers, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 20);
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function choose(teacher: TeacherSummary) {
    onChange(teacher);
    setOpen(false);
  }

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (disabled || loading) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(matches.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const next = matches[activeIndex];
      if (next) choose(next);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "field-input rtl-field relative flex w-full items-center gap-2 text-right disabled:cursor-not-allowed disabled:opacity-60",
          selected ? "text-slate-800" : "text-slate-400"
        )}
        style={{ paddingRight: 42, paddingLeft: 40 }}
      >
        <Search className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">
          {loading ? "جاري تحميل الأسماء..." : selected?.displayNameAr || "-- اختر اسم المدرس --"}
        </span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute top-1/2 right-5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              dir="rtl"
              className="field-input rtl-field h-11 w-full"
              style={{ paddingRight: 42 }}
              placeholder="ابحث عن اسم المدرس..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="ابحث عن اسم المدرس"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {matches.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400">
                {teachers.length === 0
                  ? "لا يوجد مدرسون مسجلون بعد."
                  : `لا يوجد مدرس يطابق «${query.trim()}».`}
              </li>
            ) : (
              matches.map((teacher, index) => {
                const active = index === activeIndex;
                const isSelected = teacher.id === value;
                return (
                  <li key={teacher.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(teacher)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-right text-sm",
                        active ? "bg-blue-50 text-blue-800" : "text-slate-800",
                        isSelected && "font-bold"
                      )}
                    >
                      <span className="min-w-0 truncate">{teacher.displayNameAr}</span>
                      {isSelected ? <Check className="size-4 shrink-0 text-blue-600" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
