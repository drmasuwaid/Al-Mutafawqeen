import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "منصة الواجبات المدرسية | Homework App",
  description:
    "منصة الواجبات المدرسية لمدرسة المتفوقين مع تزامن لحظي ودعم العمل دون إنترنت.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${tajawal.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f4f6f8] text-slate-800">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
