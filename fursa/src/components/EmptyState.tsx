import Link from "next/link";

/**
 * A designed empty state.
 *
 * An empty queue is information, not an absence: it should say what will appear
 * here, what causes it to appear, and — where the reader can act — offer the
 * action. `tone="clear"` is for queues where empty is the good outcome (nothing
 * awaiting human review), so it reads as reassurance rather than a dead end.
 */
export default function EmptyState({
  icon = "◍",
  title,
  body,
  action,
  tone = "neutral",
}: {
  icon?: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
  tone?: "neutral" | "clear";
}) {
  return (
    <div className={`empty-state${tone === "clear" ? " is-clear" : ""}`}>
      <span className="empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
      {action && (
        <Link className="button secondary" href={action.href}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
