type TocItem = { id: string; label: string };

export default function PageToc({ items, label = "On this page" }: { items: TocItem[]; label?: string }) {
  if (items.length < 2) return null;
  return (
    <nav className="toc" aria-label={label}>
      <span className="toc-label">{label}</span>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`}>{item.label}</a>
      ))}
    </nav>
  );
}
