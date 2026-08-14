import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUniversity } from "@/lib/session";
import UniversityTopbar from "@/components/UniversityTopbar";

export default async function UniversitySectionLayout({ children }: { children: ReactNode }) {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  return (
    <div className="uni-shell">
      <div className="uni-shell-main">
        <UniversityTopbar institution={ctx.university.institution} personName={ctx.user.name} />
        {children}
      </div>
    </div>
  );
}
