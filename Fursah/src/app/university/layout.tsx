// Every route in this portal renders per-viewer data behind the session
// cookie, so there is no meaningful shell to prerender. Opt the segment out
// of prerendering rather than fight it page by page.
export const instant = false;

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import UniversityTopbar from "@/components/UniversityTopbar";

export default async function UniversitySectionLayout({ children }: { children: ReactNode }) {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  // Curriculum-completion decisions notify the institution. Until the topbar
  // showed them there was no surface in this portal where they could be read.
  const notifications = await prisma.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="uni-shell">
      <div className="uni-shell-main">
        <UniversityTopbar
          institution={ctx.university.institution}
          personName={ctx.user.name}
          notifications={notifications.map((notification) => ({
            id: notification.id,
            title: notification.title,
            body: notification.body,
            read: notification.readAt !== null,
            createdAt: notification.createdAt.toISOString(),
          }))}
        />
        {children}
      </div>
    </div>
  );
}
