// Every route in this portal renders per-viewer data behind the session
// cookie, so there is no meaningful shell to prerender. Opt the segment out
// of prerendering rather than fight it page by page.
export const instant = false;

import type { ReactNode } from "react";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <div className="student-portal">{children}</div>;
}
