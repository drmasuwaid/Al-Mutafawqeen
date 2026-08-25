"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { copy, type Copy, type Locale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Copy;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ar";
    const saved = window.localStorage.getItem("stf-locale");
    return saved === "en" || saved === "ar" ? saved : "ar";
  });

  useEffect(() => {
    window.localStorage.setItem("stf-locale", locale);
    document.documentElement.lang = locale === "ar" ? "ar" : "en";
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      t: copy[locale],
      toggle: () => setLocale((current) => (current === "ar" ? "en" : "ar")),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}
