/**
 * Fursah ML pipeline, drawn as the seven nodes used in the AI Readiness
 * mapping (SRC, C, PP, M, P, D, SINK), with the governing document attached
 * to each one.
 *
 * Inline SVG rather than an image so it stays sharp, respects the theme, and
 * is readable by a screen reader — the figure carries the argument of the
 * submission, so it must not be an inaccessible bitmap.
 *
 * The M node is split deliberately: the deterministic scoring engine and the
 * grounded language model are separate boxes because that boundary is the
 * platform's central design claim (see clause 2a of the Responsible AI Policy).
 */

type Node = {
  id: string;
  label: string;
  detail: string;
  governs: string;
  x: number;
  tone: "data" | "model" | "human";
};

const NODES: Node[] = [
  { id: "SRC", label: "Sources", detail: "Evidence documents, employer role requirements, university offerings", governs: "PDPL · NDMO data classification", x: 0, tone: "data" },
  { id: "C", label: "Connectivity", detail: "APIs, identity federation, institutional integration", governs: "NCA ECC & CCC · DGA interoperability", x: 1, tone: "data" },
  { id: "PP", label: "Pre-processing", detail: "Extraction, normalisation to the skill taxonomy, consent enforcement", governs: "PDPL data minimisation · DPIA", x: 2, tone: "data" },
  { id: "M", label: "Models", detail: "Deterministic scoring engine + grounded language model", governs: "SDAIA AI Ethics · ISO/IEC 42001 & 23894", x: 3, tone: "model" },
  { id: "P", label: "People", detail: "Advisor and employer review, appeals, override logging", governs: "SDAIA human oversight · PDPL Art. rights", x: 4, tone: "human" },
  { id: "D", label: "Data platform", detail: "Aggregate workforce intelligence, suppressed below 5 students", governs: "National Data Governance · cloud hosting rules", x: 5, tone: "data" },
  { id: "SINK", label: "Interfaces", detail: "Student, employer, university and policy views", governs: "DGA accessibility (WCAG 2.1 AA) · Arabic-first", x: 6, tone: "data" },
];

const COL = 190;
const BOX_W = 168;
const BOX_H = 96;
const TOP = 74;
const WIDTH = COL * (NODES.length - 1) + BOX_W + 24;
const HEIGHT = 340;

function wrap(text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > max) { lines.push(line.trim()); line = word; }
    else line += " " + word;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export default function PipelineDiagram() {
  return (
    <figure className="pipeline-figure">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="pipeline-svg"
        role="img"
        aria-labelledby="pipeline-title pipeline-desc"
      >
        <title id="pipeline-title">The Fursah pipeline and the documents governing each stage</title>
        <desc id="pipeline-desc">
          Seven stages run left to right: sources, connectivity, pre-processing, models,
          people, data platform, and interfaces. Each stage lists the policies and standards
          that govern it. The models stage contains a deterministic scoring engine that
          produces every score, and a grounded language model that only extracts and explains.
          The people stage can override any model output.
        </desc>

        <defs>
          <marker id="pipe-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="pipeline-arrowhead" />
          </marker>
        </defs>

        {NODES.slice(0, -1).map((node, i) => (
          <line
            key={node.id}
            x1={node.x * COL + BOX_W + 12}
            y1={TOP + BOX_H / 2}
            x2={NODES[i + 1].x * COL + 10}
            y2={TOP + BOX_H / 2}
            className="pipeline-connector"
            markerEnd="url(#pipe-arrow)"
          />
        ))}

        {/* Oversight is not a stage in the line; it acts back on the models. */}
        <path
          d={`M ${NODES[4].x * COL + BOX_W / 2 + 12} ${TOP + BOX_H + 14}
              C ${NODES[4].x * COL} ${TOP + BOX_H + 74},
                ${NODES[3].x * COL + BOX_W} ${TOP + BOX_H + 74},
                ${NODES[3].x * COL + BOX_W / 2 + 12} ${TOP + BOX_H + 14}`}
          className="pipeline-override"
          markerEnd="url(#pipe-arrow)"
          fill="none"
        />
        <text
          x={(NODES[3].x * COL + NODES[4].x * COL) / 2 + BOX_W / 2 + 12}
          y={TOP + BOX_H + 92}
          className="pipeline-override-label"
          textAnchor="middle"
        >
          human override wins
        </text>

        {NODES.map(node => {
          const x = node.x * COL + 12;
          return (
            <g key={node.id} className={`pipeline-node tone-${node.tone}`}>
              <rect x={x} y={TOP} width={BOX_W} height={BOX_H} rx={12} className="pipeline-box" />
              <text x={x + 14} y={TOP + 24} className="pipeline-id">{node.id}</text>
              <text x={x + 14} y={TOP + 42} className="pipeline-label">{node.label}</text>
              {wrap(node.detail, 26).slice(0, 3).map((line, i) => (
                <text key={line} x={x + 14} y={TOP + 60 + i * 13} className="pipeline-detail">{line}</text>
              ))}
              {wrap(node.governs, 24).map((line, i) => (
                <text key={line} x={x + BOX_W / 2} y={TOP + BOX_H + 22 + i * 13} className="pipeline-governs" textAnchor="middle">{line}</text>
              ))}
            </g>
          );
        })}

        <text x={12} y={30} className="pipeline-heading">Pipeline stage</text>
        <text x={12} y={50} className="pipeline-subheading">governing documents shown beneath each stage</text>
      </svg>

      <figcaption>
        Every stage carries the policy that governs it. The models stage is split: the
        deterministic engine produces every score that affects a person, and the language
        model only reads documents and explains results — it never ranks anyone. Human
        review at stage P overrides any model output, and the override is logged.
      </figcaption>
    </figure>
  );
}
