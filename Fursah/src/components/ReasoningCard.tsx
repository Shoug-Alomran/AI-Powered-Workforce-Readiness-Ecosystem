export default function ReasoningCard({
  title,
  summary,
  evidence,
  limitations,
  confidence,
  model = "Deterministic match engine",
  version = "fursah-readiness-v2",
}: {
  title: string;
  summary: string;
  evidence: string[];
  limitations?: string[];
  confidence?: number | null;
  model?: string;
  version?: string;
}) {
  return <section className="reasoning-card">
    <header><div><span>EXPLAINABLE DECISION SUPPORT</span><h3>{title}</h3></div>{confidence != null && <b>{confidence}% match</b>}</header>
    <p>{summary}</p>
    <div className="reasoning-grid"><div><strong>Evidence used</strong><ul>{evidence.map(item => <li key={item}>{item}</li>)}</ul></div><div><strong>Important limits</strong><ul>{(limitations?.length ? limitations : ["Advisory only; a human retains the decision.", "Missing evidence is not treated as evidence of absence."]).map(item => <li key={item}>{item}</li>)}</ul></div></div>
    <footer><span>Method: {model}</span><span>Version: {version}</span><span>Human review required</span></footer>
  </section>;
}
