// Every route in this portal renders per-viewer data behind the session
// cookie, so there is no meaningful shell to prerender. Opt the segment out
// of prerendering rather than fight it page by page.
export const instant = false;

import type { ReactNode } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return <div className="admin-portal">
    <AdminSidebar personName={user?.name || "Administrator"} />
    <div className="admin-page-content">{children}</div>
  </div>;
}
