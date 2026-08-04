import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PreferencesControls from "@/components/PreferencesControls";

export const metadata: Metadata = {
  title: "Fursa | AI Workforce Readiness",
  description: "Connecting Saudi talent, education and employers through explainable AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
