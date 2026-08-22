// ---------------------------------------------------------------------------
// Fursah knowledge base
// ---------------------------------------------------------------------------
// The authentic public documents this project is built on, each with the
// publisher, a link to the original, and the specific thing in Fursah that
// depends on it.
//
// The rule for inclusion: an entry must be a public document that a reader can
// open and check, and it must actually be load-bearing somewhere. A standard
// we merely admire is not in this list. Where a document constrains code, the
// `appliedIn` field names the file, so a reviewer can go from the instrument
// to the line that implements it in one step.
//
// `/impact` cites the statistical sources for the figures on that page;
// `/standards` carries the conformance argument. This file is the register of
// the documents both of those rest on.
// ---------------------------------------------------------------------------

export type KnowledgeArea =
  | "ITU standards and reports"
  | "Saudi regulatory instruments"
  | "National strategy and statistics"
  | "International frameworks"
  | "Fursah governance documents";

export type KnowledgeEntry = {
  id: string;
  title: string;
  publisher: string;
  /** Designation, edition or date as published. */
  edition: string;
  url: string;
  /** What the document is. */
  about: string;
  /** What in Fursah depends on it. */
  usedFor: string;
  /** Repo-relative paths this document constrains, where it constrains code. */
  appliedIn?: string[];
  /** Original publication language, when not English. */
  language?: "Arabic" | "Arabic and English";
};

export const KNOWLEDGE_AREAS: KnowledgeArea[] = [
  "ITU standards and reports",
  "Saudi regulatory instruments",
  "National strategy and statistics",
  "International frameworks",
  "Fursah governance documents",
];

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // -------------------------------------------------------------------------
  {
    id: "y3172",
    title: "Architectural framework for machine learning in future networks including IMT-2020",
    publisher: "ITU-T Study Group 13",
    edition: "Recommendation ITU-T Y.3172 (06/2019)",
    url: "https://www.itu.int/rec/T-REC-Y.3172-201906-I/en",
    about:
      "Defines the ML pipeline through named nodes: SRC, C, PP, M, P, D and SINK. It also defines the layer that manages them. Clause 8.1 contains the pipeline definition.",
    usedFor:
      "The platform's architecture is described in these seven nodes, and each node names the component implementing it and the policy governing it. This is the primary conformance reference.",
    appliedIn: ["src/lib/standards.ts", "src/components/PipelineDiagram.tsx"],
  },
  {
    id: "ai-ready-2",
    title: "AI Ready: Analysis Towards a Standardized Readiness Framework, Report 2.0",
    publisher: "ITU",
    edition: "January 2026 · ISBN 978-92-61-41911-0",
    url: "https://aiforgood.itu.int/event/ai-readiness-hackathon-kingdom-of-saudi-arabia/",
    about:
      "Defines 13 dimensions of AI readiness and a three-part framework for identifying gaps.",
    usedFor:
      "Fursah assesses its work against all 13 dimensions. It also uses the report's framework to organise policy gaps. Dimension 9 identifies skills gap analysis as a desired output, which is a central function of Fursah.",
    appliedIn: ["src/lib/standards.ts"],
  },
  {
    id: "y3181",
    title: "Architectural framework for machine learning sandbox in future networks including IMT-2020",
    publisher: "ITU-T Study Group 13",
    edition: "Recommendation ITU-T Y.3181 (2022)",
    url: "https://www.itu.int/rec/T-REC-Y.3181/en",
    about:
      "Specifies a sandbox in which an ML model or policy is evaluated before it is allowed to affect a live system.",
    usedFor:
      "The governance scenario simulator: a proposed control is stated, checked against the safeguards, and requires a recorded human decision before activation.",
    appliedIn: ["src/actions/governance.ts", "src/app/admin/governance/page.tsx"],
  },
  {
    id: "y3176",
    title: "Machine learning marketplace integration in future networks including IMT-2020",
    publisher: "ITU-T Study Group 13",
    edition: "Recommendation ITU-T Y.3176 (2020)",
    url: "https://www.itu.int/rec/T-REC-Y.3176/en",
    about: "Covers orchestration, versioning and lifecycle management of ML models across a pipeline.",
    usedFor:
      "Every scoring surface stamps its model version onto the audit trail, so a past result can be traced to the ruleset that produced it and that ruleset can be rolled back.",
    appliedIn: ["src/lib/intelligence/readiness.ts", "src/app/admin/monitoring/page.tsx"],
  },

  // -------------------------------------------------------------------------
  {
    id: "pdpl",
    title: "Personal Data Protection Law",
    publisher: "Kingdom of Saudi Arabia",
    edition: "Royal Decree M/19 of 1443H, as amended by M/148, with Implementing Regulations",
    url: "https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf",
    about:
      "The national law for lawful processing, data minimisation, individual rights, and transfers outside the Kingdom.",
    usedFor:
      "The privacy policy follows this law clause by clause. Fursah does not collect protected characteristics. Consent is specific to each purpose and can be withdrawn. The platform also supports four data-rights requests.",
    appliedIn: ["src/lib/policies.ts", "src/app/student/data-rights/page.tsx", "docs/DPIA.md"],
    language: "Arabic and English",
  },
  {
    id: "sdaia-ethics",
    title: "AI Ethics Principles",
    publisher: "SDAIA, Saudi Data and Artificial Intelligence Authority",
    edition: "Version 1.0",
    url: "https://sdaia.gov.sa/en/SDAIA/about/Documents/ai-principles.pdf",
    about:
      "Seven principles for AI in the Kingdom, including fairness, transparency and explainability, accountability, and human oversight.",
    usedFor:
      "Every score can be reconstructed from published weights. A named reviewer can also override any automated result. These controls support explainability and human oversight.",
    appliedIn: ["src/lib/ai.ts", "src/lib/policies.ts"],
    language: "Arabic and English",
  },
  {
    id: "ndmo",
    title: "National Data Management and Personal Data Protection Standards",
    publisher: "NDMO, National Data Management Office at SDAIA",
    edition: "Current issue",
    url: "https://sdaia.gov.sa/ndmo/Files/PoliciesEn.pdf",
    about: "Data classification, quality, retention and governance controls for data held in the Kingdom.",
    usedFor:
      "Classification of evidence documents as private by default, the retention posture, and the aggregate-only treatment of institutional reporting.",
    appliedIn: ["src/lib/documents.ts", "src/lib/cohort.ts"],
    language: "Arabic and English",
  },
  {
    id: "nca-ecc",
    title: "Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC)",
    publisher: "NCA, National Cybersecurity Authority",
    edition: "ECC-1:2018 · CCC-1:2020",
    url: "https://nca.gov.sa/en/regulatory-documents/controls-list/",
    about: "Baseline cybersecurity controls for national organisations and for workloads hosted in cloud environments.",
    usedFor:
      "Private object storage with no public bucket access, server-held credentials that never reach the browser, and the hosting-region gap recorded openly in the DPIA rather than left implicit.",
    appliedIn: ["src/lib/r2.ts", "src/lib/assistant/llm.ts", "docs/DPIA.md"],
    language: "Arabic and English",
  },
  {
    id: "dga-accessibility",
    title: "Digital Accessibility Standards and Guidelines",
    publisher: "DGA, Digital Government Authority",
    edition: "Current issue",
    url: "https://dga.gov.sa/en/policies-and-regulations",
    about: "Accessibility and interoperability requirements for digital services, referencing WCAG 2.1 Level AA.",
    usedFor:
      "The accessibility statement's conformance target, the Arabic runtime layer across every portal, and the keyboard and contrast requirements applied to the interface.",
    appliedIn: ["src/lib/i18n/translate.ts", "src/components/AccessibleViewControls.tsx"],
    language: "Arabic and English",
  },

  // -------------------------------------------------------------------------
  {
    id: "vision2030",
    title: "Saudi Vision 2030 and the Human Capability Development Program",
    publisher: "Kingdom of Saudi Arabia",
    edition: "Programme documents and published KPIs",
    url: "https://www.vision2030.gov.sa/",
    about:
      "National strategy, including the commitment to align education with labour-market needs and the published unemployment and participation targets.",
    usedFor:
      "The stated alignment on the National Impact page, quoted against specific programme commitments rather than the strategy in general.",
    appliedIn: ["src/lib/nationalImpact.ts"],
    language: "Arabic and English",
  },
  {
    id: "gastat",
    title: "Labour Force Survey",
    publisher: "GASTAT, General Authority for Statistics",
    edition: "Q3 2024 and Q2 2025 releases",
    url: "https://www.stats.gov.sa/en/w/news/6",
    about: "The official quarterly labour statistics: unemployment, participation, and employment-to-population ratios.",
    usedFor:
      "The labour indicators on the National Impact page, and the evidence for the argument that the Kingdom's constraint is matching quality rather than aggregate participation.",
    appliedIn: ["src/lib/nationalImpact.ts"],
    language: "Arabic and English",
  },
  {
    id: "cua",
    title: "Graduate statistics",
    publisher: "Council of Universities Affairs",
    edition: "2023",
    url: "https://www.cua.gov.sa/",
    about: "Annual graduate totals by degree level across the Kingdom's universities.",
    usedFor: "The 2023 graduate figure and its degree-level breakdown on the National Impact page.",
    appliedIn: ["src/lib/nationalImpact.ts"],
    language: "Arabic",
  },
  {
    id: "unesco-gem",
    title: "Global Education Monitoring Report: Saudi Arabia country case study",
    publisher: "UNESCO",
    edition: "2026 edition",
    url: "https://www.unesco.org/gem-report/en/2026-gem-report-country-case-studies/saudi-arabia",
    about: "Tertiary enrolment growth and the shift in the distribution of graduates by field of study.",
    usedFor:
      "The field-mix argument: that graduate output grew while concentrating in some fields, which is the distributional problem Fursah addresses.",
    appliedIn: ["src/lib/nationalImpact.ts"],
  },

  // -------------------------------------------------------------------------
  {
    id: "iso42001",
    title: "ISO/IEC 42001:2023: Artificial intelligence management system",
    publisher: "ISO/IEC",
    edition: "2023",
    url: "https://www.iso.org/standard/81230.html",
    about: "Management-system requirements for organisations developing or using AI, including risk and impact assessment.",
    usedFor:
      "The structure of the governance surfaces: recorded decisions, model versioning, monitoring with a paused state, and a documented impact assessment.",
    appliedIn: ["docs/DPIA.md", "src/app/admin/monitoring/page.tsx"],
  },
  {
    id: "iso23894",
    title: "ISO/IEC 23894:2023: Guidance on risk management for AI",
    publisher: "ISO/IEC",
    edition: "2023",
    url: "https://www.iso.org/standard/77304.html",
    about: "Guidance on identifying, analysing and treating risks specific to AI systems.",
    usedFor: "The risk register in the DPIA, including the treatment decision recorded against each risk.",
    appliedIn: ["docs/DPIA.md"],
  },
  // -------------------------------------------------------------------------
  {
    id: "dpia",
    title: "Data Protection Impact Assessment",
    publisher: "Fursah AI, Trust and Safety",
    edition: "Version 1.1 · 21 August 2026 · prototype assessment",
    url: "https://github.com/Shoug-Alomran/AI-Powered-Workforce-Readiness-Ecosystem/blob/main/docs/DPIA.md",
    about:
      "Assessment of the processing this platform performs: evidence uploads and R2 storage, Workers AI inference, the role-scoped assistant, deterministic scoring and matching, university aggregation and cohort suppression, human verification, and appeals and data rights. Opens with a one-page summary and carries an eight-risk register with residual ratings.",
    usedFor:
      "The controls it records are the ones implemented in this repository, and the two verification scripts assert them against live data. Cross-border inference is recorded as blocking for production rather than resolved.",
    appliedIn: ["src/lib/cohort.ts", "scripts/verify-privacy.ts", "scripts/verify-evidence.ts"],
  },
  {
    id: "sdgs",
    title: "Sustainable Development Goals: targets 4.4, 5.5, 8.5, 8.6 and 10.3",
    publisher: "United Nations",
    edition: "2030 Agenda",
    url: "https://sdgs.un.org/goals",
    about: "The official target wording against which contribution can be assessed by published indicator.",
    usedFor: "The SDG alignment on the National Impact page, cited to the numbered target rather than the goal alone.",
    appliedIn: ["src/lib/nationalImpact.ts"],
  },
];

export function knowledgeByArea(area: KnowledgeArea): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter(entry => AREA_OF[entry.id] === area);
}

/**
 * Area membership, kept beside the list rather than on each entry so the
 * entries above stay grouped in reading order and a regrouping is one edit.
 */
const AREA_OF: Record<string, KnowledgeArea> = {
  y3172: "ITU standards and reports",
  "ai-ready-2": "ITU standards and reports",
  y3181: "ITU standards and reports",
  y3176: "ITU standards and reports",
  pdpl: "Saudi regulatory instruments",
  "sdaia-ethics": "Saudi regulatory instruments",
  ndmo: "Saudi regulatory instruments",
  "nca-ecc": "Saudi regulatory instruments",
  "dga-accessibility": "Saudi regulatory instruments",
  vision2030: "National strategy and statistics",
  gastat: "National strategy and statistics",
  cua: "National strategy and statistics",
  "unesco-gem": "National strategy and statistics",
  iso42001: "International frameworks",
  iso23894: "International frameworks",
  sdgs: "International frameworks",
  dpia: "Fursah governance documents",
};
