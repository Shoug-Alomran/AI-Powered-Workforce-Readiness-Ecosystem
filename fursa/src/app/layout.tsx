import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PreferencesControls from "@/components/PreferencesControls";
import AccessibleViewControls from "@/components/AccessibleViewControls";

export const metadata: Metadata = {
  metadataBase: new URL("https://fursah.org"),
  title: "Fursah | AI Workforce Readiness",
  description: "Connecting Saudi talent, education and employers through explainable AI.",
  openGraph: {
    title: "Fursah | AI Workforce Readiness",
    description: "Connecting Saudi talent, education and employers through explainable AI.",
    siteName: "Fursah",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fursah | AI Workforce Readiness",
    description: "Connecting Saudi talent, education and employers through explainable AI.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col"><Navbar />{children}<AccessibleViewControls /><PreferencesControls /><Analytics /><SpeedInsights /></body>
    </html>
  );
}
