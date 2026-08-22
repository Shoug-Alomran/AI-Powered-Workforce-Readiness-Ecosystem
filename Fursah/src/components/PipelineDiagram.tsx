import { Y3172_NODES } from "@/lib/standards";

/**
 * Fursah ML pipeline, drawn as the seven nodes defined in ITU-T Y.3172
 * clause 8.1: SRC, C, PP, M, P, D and SINK.
 *
 * The node list lives in `@/lib/standards` because the admin governance page
 * renders the same mapping and the two copies had already drifted — this one
 * had renamed C, P and D to describe Fursah's implementation rather than the
 * standard's function, so the figure claimed a node vocabulary it was not
 * using. The standard's name is the `label`; what Fursah runs there is
 * `fursah`. `/standards` carries the same seven nodes at greater length, with
 * the implementing source file for each.
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
export default function PipelineDiagram() {
  return (
    <figure className="pipeline">
      <p className="pipeline-kicker">ITU-T Y.3172 clause 8.1 · pipeline node</p>
      <p className="pipeline-sub">Governing documents shown beneath each node</p>

      <ol className="pipeline-row">
        {Y3172_NODES.map(node => (
          <li key={node.id} className={`pipeline-node tone-${node.tone}`}>
            <div className="pipeline-card">
              <span className="pipeline-id">{node.id}</span>
              <h3 className="pipeline-label">{node.label}</h3>
              <p className="pipeline-detail">{node.fursah}</p>
            </div>
            <p className="pipeline-governs">{node.governs}</p>
          </li>
        ))}
      </ol>

      <p className="pipeline-override">Human review carried by the P node overrides any output of the M node, and the override is logged.</p>

      <figcaption>
        Node names and their order are those defined in ITU-T Y.3172 clause 8.1; the text beneath
        each names what Fursah runs at that node and the policy governing it. The M node is split:
        the deterministic engine produces every score that affects a person, and the language model
        only reads documents and explains results. It never ranks anyone.
      </figcaption>
    </figure>
  );
}
