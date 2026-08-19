import { Suspense } from "react";
import Footer from "@/components/Footer";

// Footer reads the session to decide which links to show. It wraps every route,
// so awaiting it here made even the landing page dynamic and unprerenderable.
// Behind a boundary it streams in instead, and because it sits at the very
// bottom of the flow nothing above it moves when it arrives.
export default function RootTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex min-h-[calc(100vh-4rem)] flex-col"><div className="flex-1">{children}</div><Suspense fallback={null}><Footer /></Suspense></div>;
}
