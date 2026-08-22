"use client";

import { useEffect, useRef, useState } from "react";
import { markNotificationsRead } from "@/actions/account";

export type PortalNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

/**
 * The notification bell, shared by the employer and university portals.
 *
 * Both roles already had notifications written for them — employer account
 * verification, curriculum completion review, a new application — but only the
 * student portal rendered a bell, so those rows existed in the database with no
 * surface that could ever show them. This is the student component's markup and
 * classes, lifted verbatim so the two portals inherit the same design rather
 * than growing a second one.
 */
export default function PortalNotifications({
  notifications,
  emptyHint,
}: {
  notifications: PortalNotification[];
  emptyHint: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const bell = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );

  return (
    <div className="student-notifications" ref={containerRef}>
      <button
        type="button"
        className="student-notifications-trigger"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-controls="portal-notification-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {bell}
        {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <section id="portal-notification-menu" className="student-notification-menu" aria-label="Notifications">
          <header>
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</small>
            </div>
            {unreadCount > 0 && (
              <form action={markNotificationsRead}>
                <button type="submit">Mark all read</button>
              </form>
            )}
          </header>

          <div className="student-notification-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <article className={notification.read ? "" : "is-unread"} key={notification.id}>
                  <i aria-hidden />{" "}
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                    <time dateTime={notification.createdAt}>{notificationTime(notification.createdAt)}</time>
                  </div>
                </article>
              ))
            ) : (
              <div className="student-notification-empty">
                {bell}
                <strong>No notifications yet</strong>
                <p>{emptyHint}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function notificationTime(value: string) {
  const date = new Date(value);
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
