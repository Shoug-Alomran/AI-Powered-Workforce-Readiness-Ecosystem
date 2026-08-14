import type { ReactNode } from "react";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <div className="student-portal">{children}</div>;
}
