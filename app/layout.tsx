import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "PayTrail — paycheck checkups & tax-season prep",
  description:
    "PayTrail checks every pay stub, projects whether your household owes or gets a refund in April, and gets your tax documents ready for your accountant.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1024",
};

// Two shells under this root: app/(site) for the public pages (landing, demo, about, recover, billing)
// and app/(app) for the product (dashboard, upload, report, settings, privacy, accuracy).
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
