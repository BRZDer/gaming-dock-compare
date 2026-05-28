import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import fs from "fs";
import path from "path";
import { CompareProvider } from "@/components/compare/CompareProvider";
import { CompareButton } from "@/components/compare/CompareButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://gaming-dock-compare.vercel.app"

function getLatestUpdate(): string {
  try {
    const file = path.join(process.cwd(), "data/last-updated.json")
    const { updated_at } = JSON.parse(fs.readFileSync(file, "utf-8"))
    return new Date(updated_at).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Taipei",
      timeZoneName: "short",
    })
  } catch {
    return ""
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Gaming Dock Compare — Daily-Updated Docking Station Prices & Reviews",
    template: "%s — Gaming Dock Compare",
  },
  description:
    "Compare gaming docking stations by price, ports, power delivery, and reviews. Updated daily with live Amazon prices. Find the best Thunderbolt 4, Thunderbolt 3, and USB-C docks for your setup.",
  openGraph: {
    siteName: "Gaming Dock Compare",
    type: "website",
    locale: "en_US",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lastUpdated = getLatestUpdate()
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ overflowY: "scroll" }}
    >
      <body className="min-h-full flex flex-col">
        <CompareProvider>
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-lg tracking-tight">GamingDockCompare</a>
            <div className="flex items-center gap-4">
              <CompareButton />
              <nav className="flex gap-4 text-sm">
                <a href="/" className="hover:underline text-muted-foreground hover:text-foreground transition-colors">All Docks</a>
                <a href="/compare" className="hover:underline text-muted-foreground hover:text-foreground transition-colors">Compare</a>
              </nav>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground hidden sm:block">Updated {lastUpdated}</span>
              )}
            </div>
          </div>
        </header>
        {children}
        <footer className="border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between">
            <span>© 2026 GamingDockCompare. Prices updated daily.</span>
            <span>As an Amazon Associate I earn from qualifying purchases.</span>
          </div>
        </footer>
        </CompareProvider>
      </body>
    </html>
  );
}
