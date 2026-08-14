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
