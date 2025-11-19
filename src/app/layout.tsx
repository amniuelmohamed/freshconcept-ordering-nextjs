import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { defaultLocale } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fresh Concept Ordering Portal",
  description:
    "B2B wholesale ordering platform for Fresh Concept clients and employees.",
  manifest: "/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fresh Concept",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Fresh Concept Ordering Portal",
    title: "Fresh Concept Ordering Portal",
    description:
      "B2B wholesale ordering platform for Fresh Concept clients and employees.",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased bg-neutral-50 text-neutral-900`}
      >
        {children}
      </body>
    </html>
  );
}
