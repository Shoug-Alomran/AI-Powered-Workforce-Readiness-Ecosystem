import Link from "next/link";

export type ActionItem = {
  title: string;
  reason: string;
  href: string;
  action: string;
  priority?: "high" | "medium" | "low";
  meta?: string;
};

export default function ActionQueue({
  eyebrow = "NEXT BEST ACTIONS",
  title = "What needs attention",
  items,
}: {
  eyebrow?: string;
  title?: string;
  items: ActionItem[];
}) {
  return <section className="action-queue" aria-labelledby="action-queue-title">
    <header><div><span>{eyebrow}</span><h2 id="action-queue-title">{title}</h2></div><small>{items.length} action{items.length === 1 ? "" : "s"}</small></header>
    <div>{items.length ? items.map((item, index) => <article key={`${item.href}-${item.title}`}>
      <b>{String(index + 1).padStart(2, "0")}</b>
      <div><h3>{item.title}</h3><p>{item.reason}</p>{item.meta && <small>{item.meta}</small>}</div>
      <span className={`priority priority-${item.priority ?? "medium"}`}>{item.priority ?? "medium"}</span>
      <Link href={item.href}>{item.action} →</Link>
    </article>) : <p className="action-clear">Nothing is waiting. Your workspace is up to date.</p>}</div>
  </section>;
}
