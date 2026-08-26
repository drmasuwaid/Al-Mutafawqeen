"use client";

import { AuthProvider } from "@/hooks/use-auth";
import { LocaleProvider } from "@/hooks/use-locale";
import { SubjectsProvider } from "@/hooks/use-subjects";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LocaleProvider>
        <AuthProvider>
          <SubjectsProvider>
            {children}
            <Toaster />
          </SubjectsProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
