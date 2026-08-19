import type { ReactNode } from "react";

// Every route in this portal renders per-viewer data behind the session
// cookie, so there is no meaningful shell to prerender. Opt the segment out
// of prerendering rather than fight it page by page.
export const instant = false;

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
