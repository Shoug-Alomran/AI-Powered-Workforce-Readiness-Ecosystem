/**
 * Fursah ML pipeline, drawn as the seven nodes used in the AI Readiness
 * mapping (SRC, C, PP, M, P, D, SINK), with the governing document attached
 * to each one.
 *
 * Built from HTML rather than SVG. The earlier SVG version wrapped its labels
 * by splitting each string across several <text> elements, which meant the
 * Arabic layer — keyed on the exact rendered string — could never match any of
 * them, so the whole figure stayed English on an Arabic page. HTML wraps text
 * natively, so every label is one complete, translatable string, mirrors
 * correctly under dir="rtl", and reflows instead of overflowing its column.
 *
 * The M node is split deliberately: the deterministic scoring engine and the
 * grounded language model are separate concerns because that boundary is the
 * platform's central design claim (see clause 2a of the Responsible AI Policy).
 */

type Node = {
  id: string;
  label: string;
  detail: string;
  governs: string;
  tone: "data" | "model" | "human";
};

const NODES: Node[] = [
  { id: "SRC", label: "Sources", detail: "Evidence documents, employer role requirements, university offerings", governs: "PDPL · NDMO data classification", tone: "data" },
  { id: "C", label: "Connectivity", detail: "APIs, identity federation, institutional integration", governs: "NCA ECC & CCC · DGA interoperability", tone: "data" },
  { id: "PP", label: "Pre-processing", detail: "Extraction, normalisation to the skill taxonomy, consent enforcement", governs: "PDPL data minimisation · DPIA", tone: "data" },
  { id: "M", label: "Models", detail: "Deterministic scoring engine + grounded language model", governs: "SDAIA AI Ethics · ISO/IEC 42001 & 23894", tone: "model" },
  { id: "P", label: "People", detail: "Advisor and employer review, appeals, override logging", governs: "SDAIA human oversight · PDPL rights", tone: "human" },
  { id: "D", label: "Data platform", detail: "Aggregate workforce intelligence, suppressed below 5 students", governs: "National Data Governance · cloud hosting rules", tone: "data" },
  { id: "SINK", label: "Interfaces", detail: "Student, employer, university and policy views", governs: "DGA accessibility (WCAG 2.1 AA) · Arabic-first", tone: "data" },
];

export default function PipelineDiagram() {
  return (
    <figure className="pipeline">
      <p className="pipeline-kicker">Pipeline stage</p>
      <p className="pipeline-sub">Governing documents shown beneath each stage</p>

      <ol className="pipeline-row">
        {NODES.map(node => (
          <li key={node.id} className={`pipeline-node tone-${node.tone}`}>
            <div className="pipeline-card">
              <span className="pipeline-id">{node.id}</span>
              <h3 className="pipeline-label">{node.label}</h3>
              <p className="pipeline-detail">{node.detail}</p>
            </div>
            <p className="pipeline-governs">{node.governs}</p>
          </li>
        ))}
      </ol>

      <p className="pipeline-override">Human review at stage P overrides any output of stage M, and the override is logged.</p>

      <figcaption>
        Every stage carries the policy that governs it. The models stage is split: the
        deterministic engine produces every score that affects a person, and the language
        model only reads documents and explains results — it never ranks anyone.
      </figcaption>
    </figure>
  );
}
