"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalLink = { href: string; label: string };

export default function PortalNavLinks({ links, className = "" }: { links: PortalLink[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="Workspace navigation">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));
        return <Link key={link.href} href={link.href} className={active ? "portal-nav-link is-active" : "portal-nav-link"} aria-current={active ? "page" : undefined}>{link.label}</Link>;
      })}
    </nav>
  );
}
