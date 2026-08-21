import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PreferencesControls from "@/components/PreferencesControls";
import AccessibleViewControls from "@/components/AccessibleViewControls";
import ContextualWalkthrough from "@/components/ContextualWalkthrough";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  metadataBase: new URL("https://fursah.org"),
  title: "Fursah | AI Workforce Readiness",
  description: "Connecting Saudi talent, education and employers through explainable AI.",
  openGraph: {
    title: "Fursah | AI Workforce Readiness",
    description: "Connecting Saudi talent, education and employers through explainable AI.",
    siteName: "Fursah",
    type: "website",
    images: [{ url: "/banner.jpg", width: 1448, height: 1086, alt: "Fursah — AI-Powered Workforce Readiness Ecosystem for Saudi Arabia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fursah | AI Workforce Readiness",
    description: "Connecting Saudi talent, education and employers through explainable AI.",
    images: ["/banner.jpg"],
  },
};

// The walkthrough needs to know who is viewing, but nothing above it does, so
// it sits behind its own boundary and never delays the document.
async function Walkthrough() {
  const user = await getCurrentUser();
  return user ? <ContextualWalkthrough role={user.role} /> : null;
}

// Reserves the height the real navbar will occupy so the streamed-in header
// does not push the page content down. The admin portal renders no navbar at
// all, so globals.css collapses this placeholder there.
function NavbarPlaceholder() {
  return <div aria-hidden data-navbar-placeholder className="h-[69px] shrink-0" />;
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Nothing is awaited here on purpose. The document shell — and with it the
  // stylesheet link — flushes to the browser immediately, while the navbar and
  // the walkthrough stream in once the session lookup resolves.
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/*
          Resolves the theme before first paint. PreferencesControls sets the
          same attribute, but it only runs after hydration — long enough for a
          dark-mode reader to be shown a full white page first. This is
          deliberately a blocking inline script: deferring it reintroduces the
          flash it exists to prevent. It only ever writes one attribute.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('fursah-theme');" +
              "if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" +
              "document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col"><Suspense fallback={<NavbarPlaceholder />}><Navbar /></Suspense>{children}<Suspense fallback={null}><Walkthrough /></Suspense><Suspense fallback={null}><AccessibleViewControls /></Suspense><PreferencesControls /><Analytics /><SpeedInsights /></body>
    </html>
  );
}
