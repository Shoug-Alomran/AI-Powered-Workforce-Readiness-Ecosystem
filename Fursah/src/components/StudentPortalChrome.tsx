"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/actions/auth";
import AccountAvatar from "@/components/AccountAvatar";
import BrandBolt from "@/components/BrandBolt";

type Props = { name: string };

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const icons = {
  dashboard: <Svg><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Svg>,
  target: <Svg><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M15 9l6-6m-1 0h1v1"/></Svg>,
  map: <Svg><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15m6-12v15"/></Svg>,
  jobs: <Svg><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18"/></Svg>,
  award: <Svg><circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-2 4.5 2-1-9"/></Svg>,
  network: <Svg><circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m11 7-5 9m7-9 5 9M7 18h10"/></Svg>,
  bell: <Svg><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></Svg>,
};

const topLinks = [
  ["/student/dashboard", "Dashboard", icons.dashboard],
  ["/student/interests", "Career Interests", icons.target],
  ["/student/roadmap", "Career Roadmap", icons.map],
  ["/student/jobs", "Opportunities", icons.jobs],
  ["/student/profile", "Skills Passport", icons.award],
] as const;

export default function StudentPortalChrome({ name }: Props) {
  const pathname = usePathname();
  const initials = name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();
  return <header className="student-template-topnav">
    <Link href="/student/dashboard" className="student-template-topbrand"><BrandBolt /><b>FURSAH</b></Link>
    <nav aria-label="Student workspace">{topLinks.map(([href, label, icon]) => <Link key={href} href={href} className={pathname === href ? "is-active" : ""}>{icon}<span>{label}</span></Link>)}</nav>
    <div className="student-template-topuser"><button aria-label="Notifications">{icons.bell}</button><Link href="/student/account"><span><b>{name}</b><small>Student profile</small></span><AccountAvatar initials={initials}/></Link><form action={logout}><button type="submit">Log out</button></form></div>
  </header>;
}
