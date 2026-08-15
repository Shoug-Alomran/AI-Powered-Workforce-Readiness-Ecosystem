"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/actions/auth";
import AccountAvatar from "@/components/AccountAvatar";

type Item = { label: string; href: string; icon: ReactNode; match?: string[] };

const Icon = ({ children }: { children: ReactNode }) => <span className="admin-nav-icon" aria-hidden="true">{children}</span>;
const Svg = ({ children }: { children: ReactNode }) => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg></Icon>;
const icons = {
  shield: <Svg><path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></Svg>,
  building: <Svg><path d="M4 21V8l8-4v17M12 9h8v12M2 21h20"/><path d="M7 10h1m-1 4h1m-1 4h1m8-5h1m-1 4h1"/></Svg>,
  certificate: <Svg><rect x="3" y="4" width="15" height="14" rx="2"/><path d="M7 8h7M7 12h4M16 16l2 5 2-2 2 1-2-5"/></Svg>,
  users: <Svg><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></Svg>,
  queue: <Svg><path d="m4 6 2 2 3-3M4 12l2 2 3-3M4 18l2 2 3-3M12 7h8M12 13h8M12 19h8"/></Svg>,
  audit: <Svg><path d="M12 22a10 10 0 1 0-10-10c0 1.8.5 3.5 1.3 5L2 22l5-1.3A10 10 0 0 0 12 22Z"/><path d="M12 6v6l4 2"/></Svg>,
  ai: <Svg><rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 9h6v6H9zM9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/></Svg>,
  health: <Svg><path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 6-8"/></Svg>,
  security: <Svg><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></Svg>,
};

const sections: { label: string; items: Item[] }[] = [
  { label: "Governance", items: [
    { label: "Trust & Governance", href: "/admin/dashboard", icon: icons.shield, match: ["/admin/dashboard", "/admin/governance"] },
    { label: "Employer Verification", href: "/admin/dashboard#employer-verification", icon: icons.building },
    { label: "Certificate Audits", href: "/admin/evidence", icon: icons.certificate },
    { label: "User Directory", href: "/admin/dashboard#user-directory", icon: icons.users },
  ]},
  { label: "Compliance", items: [
    { label: "Moderation Queue", href: "/admin/governance#moderation-queue", icon: icons.queue },
    { label: "Audit Logs", href: "/admin/governance#audit-logs", icon: icons.audit },
    { label: "AI Governance", href: "/admin/governance#ai-governance", icon: icons.ai },
  ]},
  { label: "System", items: [
    { label: "Platform Health", href: "/admin/monitoring", icon: icons.health },
    { label: "Security", href: "/admin/data-requests", icon: icons.security },
  ]},
];

const primary = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Trust & Governance", href: "/admin/governance" },
  { label: "Certificate Audits", href: "/admin/evidence" },
  { label: "Platform Health", href: "/admin/monitoring" },
  { label: "Security", href: "/admin/data-requests" },
];

export default function AdminSidebar({ personName }: { personName: string }) {
  const pathname = usePathname();
  const currentSection = sections.flatMap(section => section.items).filter(item => {
    const target = item.href.split("#")[0];
    if (pathname === "/admin/dashboard") return target === "/admin/dashboard";
    if (pathname === "/admin/governance") return target === "/admin/governance";
    if (pathname === "/admin/evidence") return target === "/admin/evidence";
    if (pathname === "/admin/monitoring") return target === "/admin/monitoring";
    if (pathname === "/admin/data-requests") return target === "/admin/data-requests";
    return false;
  });
  const initials = personName.split(" ").map(part => part[0]).slice(0,2).join("").toUpperCase() || "AD";
  return <header className="admin-header">
    <div className="admin-header-main">
      <Link className="admin-header-brand" href="/admin/dashboard"><span className="brand-mark"><Image src="/logo.png" alt="" width={353} height={512}/></span><b>FURSAH</b><small>Admin Console</small></Link>
      <nav className="admin-primary-nav" aria-label="Administration pages">{primary.map(item => <Link key={item.href} className={pathname === item.href ? "is-active" : ""} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</nav>
      <div className="admin-header-account"><Link href="/admin/profile" aria-label="Open your account profile"><AccountAvatar initials={initials}/><span><b>{personName}</b><small>Platform administrator</small></span></Link><form action={logout}><button type="submit">Log out</button></form></div>
    </div>
    <nav className="admin-page-menu" aria-label="On this page"><strong>ON THIS PAGE</strong>{currentSection.map(item => <Link key={item.label} href={item.href}>{item.icon}<span>{item.label}</span></Link>)}</nav>
  </header>;
}
