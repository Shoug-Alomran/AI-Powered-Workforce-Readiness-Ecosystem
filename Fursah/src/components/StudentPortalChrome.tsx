"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logout } from "@/actions/auth";
import { markNotificationsRead } from "@/actions/account";
import AccountAvatar from "@/components/AccountAvatar";
import BrandBolt from "@/components/BrandBolt";

type NotificationItem = { id: string; title: string; body: string; read: boolean; createdAt: string };
type Props = { name: string; notifications: NotificationItem[] };

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

function notificationTime(value: string) {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StudentPortalChrome({ name, notifications }: Props) {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const initials = name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return <header className="student-template-topnav">
    <Link href="/student/dashboard" className="student-template-topbrand"><BrandBolt /><b>FURSAH</b></Link>
    <nav aria-label="Student workspace">{topLinks.map(([href, label, icon]) => <Link key={href} href={href} className={pathname === href ? "is-active" : ""}>{icon}<span>{label}</span></Link>)}</nav>
    <div className="student-template-topuser">
      <div className="student-notifications" ref={notificationRef}>
        <button type="button" className="student-notifications-trigger" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={notificationsOpen} aria-controls="student-notification-menu" onClick={() => setNotificationsOpen((open) => !open)}>{icons.bell}{unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
        {notificationsOpen && <section id="student-notification-menu" className="student-notification-menu" aria-label="Notifications">
          <header><div><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</small></div>{unreadCount > 0 && <form action={markNotificationsRead}><button type="submit">Mark all read</button></form>}</header>
          <div className="student-notification-list">{notifications.length > 0 ? notifications.map((notification) => <article className={notification.read ? "" : "is-unread"} key={notification.id}><i aria-hidden /> <div><strong>{notification.title}</strong><p>{notification.body}</p><time dateTime={notification.createdAt}>{notificationTime(notification.createdAt)}</time></div></article>) : <div className="student-notification-empty">{icons.bell}<strong>No notifications yet</strong><p>Updates about applications, evidence, and reviews will appear here.</p></div>}</div>
          <Link href="/student/privacy" onClick={() => setNotificationsOpen(false)}>View notification history</Link>
        </section>}
      </div>
      <Link href="/student/account"><span><b>{name}</b><small>Student profile</small></span><AccountAvatar initials={initials}/></Link><form action={logout}><button type="submit">Log out</button></form>
    </div>
  </header>;
}
