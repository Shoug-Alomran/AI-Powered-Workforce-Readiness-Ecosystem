// ---------------------------------------------------------------------------
// Standards conformance registry
// ---------------------------------------------------------------------------
// The single source of truth for how Fursah maps onto the ITU material the
// AI Readiness Hackathon is assessed against:
//
//   - ITU-T Y.3172 (2019), clause 8.1  -> Y3172_NODES
//   - ITU-T Y.3181 / Y.3176 extensions -> Y3172_EXTENSIONS
//   - ITU AI Ready Report 2.0 (Jan 2026), 13 dimensions -> ITU_DIMENSIONS
//   - ITU AI Ready Report 2.0, chapter 4 gap taxonomy   -> POLICY_GAPS
//
// Two surfaces render the pipeline: the public figure on the Responsible AI
// policy page (`PipelineDiagram`) and the admin governance page. They used to
// carry independent copies of the node list and had already drifted — the
// public copy renamed C, P and D to describe Fursah's implementation instead
// of the standard's function, so the figure claimed conformance to a node
// vocabulary it was not actually using. Both now read this file, so the node
// names cannot diverge from the standard or from each other again.
//
// `standardFunction` paraphrases clause 8.1. `fursah` says what runs at that
// node here. Keep the two apart: collapsing them is what caused the drift.
// ---------------------------------------------------------------------------

export const Y3172_REFERENCE =
  "ITU-T Y.3172 (06/2019), Architectural framework for machine learning in future networks including IMT-2020, clause 8.1";

export const Y3172_URL = "https://www.itu.int/rec/T-REC-Y.3172-201906-I/en";

export type PipelineTone = "data" | "model" | "human";

export type PipelineNode = {
  /** Node identifier as written in clause 8.1. */
  id: string;
  /** Node name as written in clause 8.1. */
  label: string;
  /** What the standard says this node is for. */
  standardFunction: string;
  /** What Fursah runs at this node. Rendered under the label in the figure. */
  fursah: string;
  /** Source files implementing this node, repo-relative. */
  implementation: string[];
  /** Instruments governing this node. */
  governs: string;
  tone: PipelineTone;
};

export const Y3172_NODES: PipelineNode[] = [
  {
    id: "SRC",
    label: "Source",
    standardFunction: "Supplies the data used as input to the ML pipeline.",
    fursah: "Evidence documents, employer role requirements, university offerings",
    implementation: ["prisma/schema.prisma", "src/lib/documents.ts", "src/actions/employer.ts"],
    governs: "PDPL · NDMO data classification",
    tone: "data",
  },
  {
    id: "C",
    label: "Collector",
    standardFunction: "Collects data from one or more source nodes.",
    fursah: "Role-scoped ingestion through APIs, identity federation and institutional integration",
    implementation: ["src/app/api/", "src/lib/session.ts", "src/lib/r2.ts"],
    governs: "NCA ECC & CCC · DGA interoperability",
    tone: "data",
  },
  {
    id: "PP",
    label: "Preprocessor",
    standardFunction: "Cleans, aggregates and otherwise prepares collected data before it reaches the model.",
    fursah: "Extraction, normalisation to the skill taxonomy, consent enforcement",
    implementation: ["src/lib/evidence-ai.ts", "src/lib/careerTracks.ts", "src/actions/documents.ts"],
    governs: "PDPL data minimisation · DPIA",
    tone: "data",
  },
  {
    id: "M",
    label: "Model",
    standardFunction: "Hosts the machine learning models that produce the pipeline's output.",
    fursah: "Deterministic scoring engine + grounded language model",
    implementation: ["src/lib/intelligence/readiness.ts", "src/lib/ai.ts", "src/lib/assistant/llm.ts"],
    governs: "SDAIA AI Ethics · ISO/IEC 42001 & 23894",
    tone: "model",
  },
  {
    id: "P",
    label: "Policy",
    standardFunction: "Carries the policies that constrain how the pipeline may operate.",
    fursah: "Consent rules, review thresholds, suppression floor, and the human override that binds M",
    implementation: ["src/actions/governance.ts", "src/lib/cohort.ts", "src/lib/policies.ts"],
    governs: "SDAIA human oversight · PDPL rights",
    tone: "human",
  },
  {
    id: "D",
    label: "Distributor",
    standardFunction: "Distributes the model's output results to their destinations.",
    fursah: "Releases each result only to the role authorised to receive it; aggregates suppressed below 5 students",
    implementation: ["src/lib/intelligence/ecosystem.ts", "src/lib/cohort.ts", "src/lib/assistant/context.ts"],
    governs: "National Data Governance · cloud hosting rules",
    tone: "data",
  },
  {
    id: "SINK",
    label: "Sink",
    standardFunction: "Receives the distributed output and acts on it.",
    fursah: "Student, employer, university and policy interfaces",
    implementation: ["src/app/student/", "src/app/employer/", "src/app/university/", "src/app/workforce-intelligence/"],
    governs: "DGA accessibility (WCAG 2.1 AA) · Arabic-first",
    tone: "data",
  },
];

/**
 * Nodes Fursah runs that clause 8.1 does not define, drawn from the two
 * Recommendations that extend Y.3172. Listed separately rather than folded
 * into the seven, because presenting a non-8.1 node as an 8.1 node is the
 * error this file exists to prevent.
 */
export const Y3172_EXTENSIONS: {
  label: string;
  reference: string;
  fursah: string;
  implementation: string[];
  status: "Implemented" | "Prototype";
}[] = [
  {
    label: "Sandbox",
    reference: "ITU-T Y.3181, architectural framework for ML sandbox",
    fursah:
      "Governance scenarios are evaluated against the safeguards before a control is activated, and the human decision — including an override — is recorded.",
    implementation: ["src/actions/governance.ts", "src/app/admin/governance/page.tsx"],
    status: "Prototype",
  },
  {
    label: "Orchestrator",
    reference: "ITU-T Y.3176, ML marketplace integration and orchestration",
    fursah:
      "Every scoring surface stamps its model version onto the audit trail, so a result can be traced to the ruleset that produced it and that ruleset can be rolled back.",
    implementation: ["src/lib/intelligence/readiness.ts", "src/app/admin/monitoring/page.tsx"],
    status: "Prototype",
  },
];

// ---------------------------------------------------------------------------
// ITU AI Ready Report 2.0 — the 13 dimensions
// ---------------------------------------------------------------------------
// Coverage is recorded honestly. A dimension Fursah does not address is marked
// "out-of-scope" with the reason, because a self-assessment that claims all
// thirteen is not a self-assessment. The report's own framing is that these
// dimensions are derived bottom-up from Plugfest projects, so partial coverage
// is the expected result for any single application.

export type DimensionCoverage = "addressed" | "partial" | "out-of-scope";

export type Dimension = {
  number: number;
  title: string;
  /** What the report says the dimension measures. */
  measures: string;
  coverage: DimensionCoverage;
  /** How Fursah addresses it, or why it does not. */
  fursah: string;
  /** Where in the platform, when addressed. */
  evidence?: string;
};

export const ITU_DIMENSIONS: Dimension[] = [
  {
    number: 1,
    title: "Data/model Marketplace",
    measures:
      "Creation of an environment where data, expert knowledge and models are exchanged and turned into business value.",
    coverage: "partial",
    fursah:
      "The skill taxonomy is a shared reference that employers, universities and students all write against, which is the precondition for exchange. No marketplace or monetisation layer exists in the prototype.",
    evidence: "src/lib/careerTracks.ts",
  },
  {
    number: 2,
    title: "Generated Content Marketplace",
    measures:
      "Ease of creating new datasets, models and services by plugging existing materials together.",
    coverage: "out-of-scope",
    fursah:
      "Fursah generates no tradeable content. The language model reads documents and explains results; it produces no dataset or model asset intended for reuse or exchange.",
  },
  {
    number: 3,
    title: "Cross-domain correlation analysis",
    measures: "Similarities and patterns across domain workflows, and opportunities to integrate AI across them.",
    coverage: "partial",
    fursah:
      "The platform correlates two domains that are normally measured separately — higher education and labour demand — and publishes the coverage gap between them as a single figure.",
    evidence: "src/lib/intelligence/ecosystem.ts",
  },
  {
    number: 4,
    title: "Contextualization and Regional Impact",
    measures:
      "Adaptation of solutions to regional context: locally collected data, regional guidelines, indigenous solutions.",
    coverage: "addressed",
    fursah:
      "Built for the Saudi context rather than localised into it: the taxonomy, the evidence types, the Arabic interface layer, and the governance mapping to PDPL, SDAIA, NDMO and NCA instruments are all regional inputs, not translations of a foreign design.",
    evidence: "src/lib/i18n/, src/lib/policies.ts",
  },
  {
    number: 5,
    title: "Level of Integration of AI in Workflows",
    measures:
      "How well AI is integrated into a domain workflow and what benefit it delivers; interoperability of the interfaces involved.",
    coverage: "addressed",
    fursah:
      "AI sits at four defined points in the education-to-employment workflow — evidence extraction, readiness scoring, role matching, curriculum alignment — rather than as a single bolt-on feature. Each point has a named input, a named output and a human decision downstream of it.",
    evidence: "src/lib/intelligence/",
  },
  {
    number: 6,
    title: "Human Interface",
    measures:
      "Accessibility of interfaces, multi-modal content, local language availability, ease of interaction for people with special needs.",
    coverage: "addressed",
    fursah:
      "Arabic runs as a full runtime layer across every portal rather than a separate site, targets WCAG 2.1 AA, and the role-scoped assistant provides a conversational route to the same figures the dashboards show. The accessibility conformance claim is internal review, not an independent audit.",
    evidence: "src/lib/i18n/translate.ts, src/components/FursahAssistant.tsx",
  },
  {
    number: 7,
    title: "Strategy Alignment",
    measures:
      "Coordination of AI integration strategy across distributed entities — industry, academia, government.",
    coverage: "addressed",
    fursah:
      "The three stakeholder groups the report names are the platform's three portals, and the intelligence layer is the coordination mechanism between them. Alignment to the Human Capability Development Program is stated against specific commitments.",
    evidence: "src/lib/nationalImpact.ts",
  },
  {
    number: 8,
    title: "Collaboration with AI",
    measures: "The degree to which humans dynamically interact with and shape AI output, rather than only consuming it.",
    coverage: "addressed",
    fursah:
      "Every extraction is a proposal a human accepts or rejects, and the rejection is retained. Students may dismiss a suggested career direction, and appeals against any automated result route to a named reviewer whose decision supersedes the model.",
    evidence: "src/actions/documents.ts, src/actions/governance.ts",
  },
  {
    number: 9,
    title: "Impacts of Humans in AI Integration",
    measures:
      "Skill distribution and levels, ecosystem ability to develop AI talent, and — named explicitly in the report — skills gap analysis identifying what skills are currently lacking.",
    coverage: "addressed",
    fursah:
      "This is the platform's primary output. Fursah computes the skills gap at three resolutions: per student against a target role, per institution against employer demand, and per ecosystem as the set of requested skills no university offering covers.",
    evidence: "src/lib/intelligence/readiness.ts, src/app/workforce-intelligence/page.tsx",
  },
  {
    number: 10,
    title: "AI & Policies",
    measures:
      "The ability of decision makers to experiment with and review policy impact using AI, and the readiness of policy to enable AI integration.",
    coverage: "addressed",
    fursah:
      "The governance sandbox lets an operator state a proposed control, see which safeguards it breaches, and record the human decision. The workforce-intelligence surface is the evidence base a policymaker would review between statistical releases.",
    evidence: "src/app/admin/governance/page.tsx",
  },
  {
    number: 11,
    title: "AI for Inclusion",
    measures: "Use of AI techniques to bridge access gaps for underserved groups.",
    coverage: "addressed",
    fursah:
      "Fursah collects no gender, nationality, age or GPA field, so none can enter a ranking. Assessment is against published criteria identical for every institution, which is the mechanism by which a student from a less prestigious university is scored on evidence rather than on provenance.",
    evidence: "prisma/schema.prisma, docs/DPIA.md",
  },
  {
    number: 12,
    title: "Granular Priorities",
    measures:
      "Availability of granular user priorities that map onto broader solutions, and customisation of the model to local context.",
    coverage: "partial",
    fursah:
      "Career tracks carry per-skill weights, and universities set their own offerings, so priorities are expressible at institution level. There is no mechanism yet for a region or sector to set its own weighting over the national taxonomy.",
    evidence: "src/lib/careerTracks.ts",
  },
  {
    number: 13,
    title: "Digital Infrastructure",
    measures:
      "Availability of devices, computing capability, connectivity and energy, including the nodes identified in ITU-T Y.3172.",
    coverage: "partial",
    fursah:
      "The Y.3172 nodes are identified and mapped above. Infrastructure readiness itself is a national measure rather than an application one, and the prototype's own hosting is a declared gap — see the implementation gaps below.",
    evidence: "src/lib/standards.ts",
  },
];

// ---------------------------------------------------------------------------
// Policy gaps
// ---------------------------------------------------------------------------
// Structured on the three gap types in chapter 4 of the AI Ready Report 2.0.
// These are gaps this project actually ran into while being built, not a
// literature survey. Where a gap is blocking, it says so.

export type GapCategory =
  | "International standards"
  | "National policy"
  | "Implementation";

export type PolicyGap = {
  id: string;
  category: GapCategory;
  title: string;
  /** What we hit. */
  observed: string;
  /** Why it is not solvable inside the application. */
  why: string;
  /** What would close it. */
  recommendation: string;
  blocking?: boolean;
};

export const POLICY_GAPS: PolicyGap[] = [
  {
    id: "fairness-without-attributes",
    category: "National policy",
    title: "Fairness cannot be measured without collecting what fairness law forbids collecting",
    observed:
      "Fursah deliberately collects no gender, nationality, age or GPA, so no protected characteristic can enter a score. The same decision makes disparate-impact testing impossible: there is no attribute to disaggregate outcomes by.",
    why:
      "Data minimisation and demonstrable non-discrimination pull in opposite directions, and no instrument we could find resolves which takes precedence for an employment-adjacent system. Proxies remain: institution, region and career interruption can each stand in for a protected class.",
    recommendation:
      "A lawful basis for holding protected attributes strictly for fairness auditing, held separately from the scoring path and accessible only to an auditor. Without it, every minimising system in this category is structurally unauditable.",
    blocking: false,
  },
  {
    id: "cross-border-inference",
    category: "National policy",
    title: "No in-Kingdom inference path for a prototype at this scale",
    observed:
      "Application hosting, object storage and model inference all currently run outside the Kingdom. The DPIA records this as risk R5 and marks it blocking for production.",
    why:
      "PDPL transfer conditions are clear about the obligation, but a small project has no accessible compliant inference option: the affordable model-serving platforms are all extraterritorial, and the in-Kingdom alternatives are procurement relationships rather than services one can sign up for.",
    recommendation:
      "A published tier of in-Kingdom inference reachable by research and prototype workloads, or a defined sandbox basis under which pre-production systems may use extraterritorial inference on non-production data with disclosure.",
    blocking: true,
  },
  {
    id: "skills-taxonomy-interoperability",
    category: "International standards",
    title: "No standard skill taxonomy for education-to-employment interoperability",
    observed:
      "Matching a course outcome to an employer requirement requires both to name the same skill. No national or international taxonomy is authoritative here, so Fursah carries its own seeded reference table.",
    why:
      "This is a data-harmonisation gap of the kind chapter 4 names directly. Every platform in this category invents its own taxonomy, which makes results incomparable between platforms and prevents an institution from carrying its mapping to another system.",
    recommendation:
      "A standardised, versioned skill taxonomy with a defined extension mechanism, so that a curriculum mapping made once is portable and two platforms' readiness figures mean the same thing.",
    blocking: false,
  },
  {
    id: "verified-evidence-portability",
    category: "International standards",
    title: "Verified credentials are not portable between systems",
    observed:
      "A human reviewer approves an uploaded certificate and it becomes verified evidence inside Fursah. That verification cannot leave the platform: another system must re-verify from scratch.",
    why:
      "There is no standard representation for 'this evidence was checked by a named party under a stated procedure' that a receiving system can evaluate. Verification effort is therefore duplicated at every boundary, which is the cost that keeps credential checking manual.",
    recommendation:
      "A verifiable-credential profile for skills evidence that carries the verifying party, the procedure applied and its date, so a receiving system can decide whether to accept it rather than repeat it.",
    blocking: false,
  },
  {
    id: "no-trend-baseline",
    category: "Implementation",
    title: "No public longitudinal series to validate workforce signals against",
    observed:
      "Fursah publishes no trend, growth or forecast figure anywhere, and the assistant is instructed to refuse trend questions, because the platform stores no historical series and none is available to check against.",
    why:
      "Graduate and labour figures are published annually or quarterly by separate authorities on separate schedules and cuts. There is no joined education-to-employment outcome series at the resolution a matching system would need to know whether its recommendations worked.",
    recommendation:
      "A published graduate-outcomes series linking field of study to employment outcome at a suppressed but usable granularity. Without it, no platform in this category can demonstrate effect rather than activity.",
    blocking: false,
  },
  {
    id: "automated-decision-threshold",
    category: "Implementation",
    title: "No defined threshold for when employment decision support becomes an automated decision",
    observed:
      "Fursah ranks candidates and states the ranking is advisory. Nothing prevents an employer from screening by that ranking in practice, which would make it decisive without ever being labelled a decision.",
    why:
      "The distinction between decision support and automated decision-making is stated in principle but has no operational test. A platform can satisfy every disclosure requirement while its output is used exactly as an automated decision.",
    recommendation:
      "An operational test for effective automation — pass-through rate, override rate, or a mandated minimum review — so the obligation attaches to how output is used rather than how it is described.",
    blocking: false,
  },
];

export const GAP_CATEGORIES: GapCategory[] = [
  "International standards",
  "National policy",
  "Implementation",
];
