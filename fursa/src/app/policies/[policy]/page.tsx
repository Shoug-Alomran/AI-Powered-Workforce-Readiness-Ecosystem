import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POLICIES, POLICY_SLUGS } from "@/lib/policies";

export function generateStaticParams() {
  return POLICY_SLUGS.map(policy => ({ policy }));
}

export async function generateMetadata({ params }: { params: Promise<{ policy: string }> }): Promise<Metadata> {
  const { policy } = await params;
  const content = POLICIES[policy];
  if (!content) return {};
  return { title: `${content.title} | Fursah`, description: content.summary };
}

export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const content = POLICIES[policy];
  if (!content) notFound();

  return <main className="page-shell policy-page" style={{ maxWidth: 820 }}>
    <span className="eyebrow">Fursah policies</span>
    <h1 className="page-title">{content.title}</h1>
    <p className="muted">Version {content.version} · Effective {content.effective} · Last updated {content.updated}</p>
    <div className="notice" style={{ marginTop: 24 }}>{content.summary}</div>

    {content.clauses.map(clause => <section className="card policy-clause" style={{ marginTop: 18 }} key={clause.heading}>
      <h2>{clause.heading}</h2>
      {clause.paragraphs?.map(text => <p className="muted" key={text}>{text}</p>)}
      {clause.bullets && <ul className="policy-list">{clause.bullets.map(item => <li className="muted" key={item}>{item}</li>)}</ul>}
    </section>)}

    {content.attachment && <section className="card policy-clause" style={{ marginTop: 18 }}>
      <h2>Supporting documentation</h2>
      <p className="muted">{content.attachment.body}</p>
      <a className="link" href={content.attachment.href} target="_blank" rel="noopener noreferrer">{content.attachment.label} ↗</a>
    </section>}

    <nav className="policy-nav" aria-label="Other policies">
      <h2>Related policies</h2>
      {POLICY_SLUGS.filter(slug => slug !== policy).map(slug => <Link href={`/policies/${slug}`} key={slug}>{POLICIES[slug].title}</Link>)}
    </nav>
  </main>;
}
