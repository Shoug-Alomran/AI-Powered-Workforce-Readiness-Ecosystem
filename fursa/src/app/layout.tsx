import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PreferencesControls from "@/components/PreferencesControls";

export const metadata: Metadata = {
  metadataBase: new URL("https://fursa.shoug-tech.com"),
  title: "Fursa | AI Workforce Readiness",
  description: "Connecting Saudi talent, education and employers through explainable AI.",
  openGraph: {
    title: "Fursa | AI Workforce Readiness",
    description: "Connecting Saudi talent, education and employers through explainable AI.",
    siteName: "Fursa",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fursa | AI Workforce Readiness",
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
      <body className="min-h-full flex flex-col"><Navbar />{children}<PreferencesControls /></body>
    </html>
  );
}
