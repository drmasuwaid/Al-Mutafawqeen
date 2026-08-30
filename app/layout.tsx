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
  title: "واجباتي",
  applicationName: "واجباتي",
  description:
    "منصة الواجبات المدرسية لمدرسة المتفوقين مع تزامن لحظي للواجبات والمرفقات.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "واجباتي",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
