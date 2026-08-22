from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)

BLUE = colors.HexColor("#2563EB")
NAVY = colors.HexColor("#0B1220")
INK = colors.HexColor("#182033")
MUTED = colors.HexColor("#5B6577")
PALE = colors.HexColor("#EEF4FF")
GREEN = colors.HexColor("#16845B")
AMBER = colors.HexColor("#A76512")
RED = colors.HexColor("#B63B32")
LINE = colors.HexColor("#D9E1EE")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleX", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=NAVY, spaceAfter=10))
styles.add(ParagraphStyle(name="Deck", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=16, textColor=MUTED, spaceAfter=10))
styles.add(ParagraphStyle(name="H1X", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=NAVY, spaceBefore=8, spaceAfter=8))
styles.add(ParagraphStyle(name="H2X", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=BLUE, spaceBefore=7, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyX", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=12.2, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="SmallX", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.2, leading=9.8, textColor=MUTED))
styles.add(ParagraphStyle(name="TinyX", parent=styles["BodyText"], fontName="Helvetica", fontSize=6.4, leading=8.2, textColor=MUTED))
styles.add(ParagraphStyle(name="CellX", parent=styles["BodyText"], fontName="Helvetica", fontSize=6.7, leading=8.5, textColor=INK))
styles.add(ParagraphStyle(name="CellHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=6.8, leading=8.2, textColor=colors.white, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="Kicker", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=BLUE, spaceAfter=5))
styles.add(ParagraphStyle(name="CenterSmall", parent=styles["SmallX"], alignment=TA_CENTER))


def p(text, style="BodyX"):
    return Paragraph(text, styles[style])


def page_frame(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10.5 * mm, "Fursah - AI Readiness Hackathon: KSA - Judge Review Edition")
    canvas.drawRightString(width - 18 * mm, 10.5 * mm, str(doc.page))
    canvas.restoreState()


def table(data, widths, header=True, font=6.7, padd=4):
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), padd),
        ("RIGHTPADDING", (0, 0), (-1, -1), padd),
        ("TOPPADDING", (0, 0), (-1, -1), padd),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padd),
        ("FONTNAME", (0, 1 if header else 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1 if header else 0), (-1, -1), font),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFD")]),
    ]
    if header:
        commands += [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold")]
    t.setStyle(TableStyle(commands))
    return t


def metric_row(items):
    data = [[p(v, "H1X") for v, _ in items], [p(label, "CenterSmall") for _, label in items]]
    t = Table(data, colWidths=[55 * mm] * len(items), rowHeights=[13 * mm, 11 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), .4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), .4, colors.white), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


NODES = [
    ("SRC", "Source", "Evidence, role requirements, university offerings", "PDPL; NDMO classification"),
    ("C", "Collector", "Role-scoped APIs, sessions and institutional ingestion", "NCA ECC/CCC; DGA interoperability"),
    ("PP", "Preprocessor", "Document extraction, taxonomy normalization, consent", "PDPL minimization; DPIA"),
    ("M", "Model", "Deterministic scoring plus grounded language model", "SDAIA AI Ethics; ISO 42001/23894"),
    ("P", "Policy", "Consent, review thresholds, suppression and override", "PDPL rights; human oversight"),
    ("D", "Distributor", "Role-authorized output; cohorts suppressed below five", "National Data Governance"),
    ("SINK", "Sink", "Student, employer, university and policy interfaces", "WCAG 2.1 AA; Arabic-first"),
]

DIMS = [
    (1,"Data/model Marketplace","Partial","Shared, versioned skill taxonomy; no marketplace or monetization layer."),
    (2,"Generated Content Marketplace","Out of scope","No tradeable generated dataset or model asset is produced."),
    (3,"Cross-domain correlation analysis","Partial","Connects higher-education supply with employer demand."),
    (4,"Contextualization and Regional Impact","Addressed","Saudi taxonomy, Arabic interface, PDPL/SDAIA/NDMO/NCA controls."),
    (5,"Level of Integration of AI in Workflows","Addressed","Extraction, readiness, matching and curriculum alignment have named inputs, outputs and downstream humans."),
    (6,"Human Interface","Addressed","Bilingual runtime, accessibility target and role-scoped conversational explanations."),
    (7,"Strategy Alignment","Addressed","Students, employers and universities coordinate through one intelligence layer aligned to HCDP."),
    (8,"Collaboration with AI","Addressed","Humans approve extraction, may reject direction suggestions, and decide appeals and overrides."),
    (9,"Impacts of Humans in AI Integration","Addressed","Skills-gap analysis at student, institution and ecosystem resolutions."),
    (10,"AI and Policies","Addressed","Governance scenarios, audit events and policy-gap evidence support decision makers."),
    (11,"AI for Inclusion","Addressed","No gender, nationality, age or GPA enters scoring; published job-related criteria apply consistently."),
    (12,"Granular Priorities","Partial","Per-track and institution priorities exist; regional/sector weighting is future work."),
    (13,"Digital Infrastructure","Partial","Pipeline nodes are mapped; compliant production hosting remains a declared blocking gap."),
]

POLICIES = [
    ("Fairness audit data", "SDAIA/NDMO + MHRSD", "Controlled pilot or 100 consequential recommendations", "Separate audit attributes; quarterly proxy/disparity review"),
    ("In-Kingdom inference", "SDAIA + CST + approved cloud providers", "Before identifiable production data reaches a model", "All production inference/storage in approved region"),
    ("National skill taxonomy", "SDAIA + MoE + ETEC + skills councils", "Cross-institution skill exchange", "95% resolution to versioned national identifiers"),
    ("Portable verified evidence", "MoE + ETEC + credential issuers", "Verified evidence leaves the reviewing system", "Issuer, reviewer, method, date, status and revocation retained"),
    ("Graduate outcome baseline", "GASTAT + MoE + HCDP", "Annual outcomes publication", "Stable suppressed series with three comparable periods"),
    ("Effective automation threshold", "MHRSD + SDAIA", "A score excludes or prioritizes a candidate", "Human review evidence; override/appeal monitoring; suspension if absent"),
]

SOURCES = [
    ("ITU-T Y.3172 (06/2019)", "Pipeline vocabulary and clause 8.1 node mapping", "itu.int/rec/T-REC-Y.3172-201906-I/en"),
    ("ITU AI Ready Report 2.0 (2026)", "13 dimensions and chapter 4 gap taxonomy", "aiforgood.itu.int/event/ai-readiness-hackathon-kingdom-of-saudi-arabia/"),
    ("Saudi Personal Data Protection Law", "Minimization, rights, consent and transfer conditions", "sdaia.gov.sa"),
    ("SDAIA AI Ethics Principles", "Fairness, explainability, accountability and human oversight", "sdaia.gov.sa"),
    ("NCA ECC and CCC", "Cybersecurity and cloud-control baseline", "nca.gov.sa/en/regulatory-documents/controls-list/"),
    ("DGA Digital Accessibility", "WCAG 2.1 AA target and bilingual digital-service design", "dga.gov.sa"),
    ("Vision 2030 / HCDP", "Education-to-labor-market alignment", "vision2030.gov.sa"),
    ("ISO/IEC 42001 and 23894", "AI management and risk-management structure", "iso.org"),
]


def build_report():
    path = OUT / "fursah-ai-readiness-judge-submission.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=17*mm, bottomMargin=20*mm, title="Fursah AI Readiness Judge Submission")
    story = []
    story += [p("AI READINESS HACKATHON: KSA", "Kicker"), p("Fursah: Explainable AI for Workforce Readiness", "TitleX"), p("Team Visionary | Shoug Alomran, Lolwah Alsaadoun, Renad Alsulaiman, Taleen Bin Nader | fursah.org | support@fursah.org", "Deck"), HRFlowable(width="100%", thickness=1, color=BLUE), Spacer(1, 6)]
    story += [p("Executive decision", "H1X"), p("Fursah is a working education-to-employment decision-support prototype built around a strict boundary: deterministic, versioned rules produce every consequential score; generative AI proposes document fields and explains authorized platform facts; humans verify evidence and retain every consequential decision. The contribution is both a use case and a reviewable AI-readiness package: Y.3172 traceability, a 13-dimension self-assessment, 17 authentic knowledge-base entries, and six operational policy recommendations."), metric_row([("7/7","Y.3172 nodes mapped"),("13/13","dimensions assessed"),("17","authentic sources")]), Spacer(1, 10)]
    story += [p("The problem and intervention", "H1X"), p("Students receive opaque rejections, employers screen through weak proxies, and universities learn about skill mismatch only after curriculum cycles have passed. Fursah turns employer requirements, evidence-backed student profiles and university offerings into a shared skill language. It produces readiness explanations and next actions for students, job-related fit explanations for employers, and privacy-suppressed demand signals for universities."), p("Implemented proof, not claimed impact", "H2X"), p("The prototype includes prepared synthetic accounts. It does not claim improved placement rates, reduced time-to-hire or independent fairness validation. Those are post-deployment outcomes requiring real participants and governed evaluation. Production remains blocked until hosting, processor and cross-border-transfer controls are institutionally approved."), PageBreak()]

    story += [p("Criterion 1 - Clear Y.3172 use-case pipeline", "H1X"), p("The node labels and functions below follow ITU-T Y.3172 clause 8.1. Fursah implementation text is deliberately kept separate from the standard function. Source traceability is published at fursah.org/standards."), table([[p("Node","CellHead"),p("Standard role","CellHead"),p("Fursah implementation","CellHead"),p("Governing instruments","CellHead")]] + [[p(a,"CellX"),p(b,"CellX"),p(c,"CellX"),p(d,"CellX")] for a,b,c,d in NODES], [16*mm,30*mm,72*mm,55*mm]), Spacer(1,8), p("The critical boundary at M", "H2X"), p("Readiness, gap and candidate-role scores are calculated from published weights. The production assistant was verified on 21 August 2026 returning a grounded explanation through Cloudflare Workers AI using Llama 3.1 8B; it repeated the same component figures displayed by the dashboard and disclosed its grounding versions. The assistant cannot calculate or alter a score, ranking or evidence decision."), PageBreak()]

    story += [p("Criterion 2 - Mapping to all 13 AI Readiness dimensions", "H1X"), p("Coverage is intentionally not universal. Addressed means implemented in the prototype; Partial means an enabling component exists but the full dimension exceeds application scope; Out of scope means Fursah makes no claim."), table([[p("#","CellHead"),p("Dimension","CellHead"),p("Coverage","CellHead"),p("Fursah evidence or limitation","CellHead")]] + [[p(str(n),"CellX"),p(t,"CellX"),p(c,"CellX"),p(e,"CellX")] for n,t,c,e in DIMS], [10*mm,47*mm,25*mm,91*mm]), Spacer(1,7), p("Dimension 9 is the central contribution", "H2X"), p("The AI Ready Report explicitly identifies skills-gap analysis as a desired framework output. Fursah computes gaps at three resolutions: a student against a target role, an institution against employer demand, and the ecosystem as requested skills not covered by university offerings."), PageBreak()]

    story += [p("Criterion 3 - Contribution to the AI-RE knowledge base", "H1X"), p("The inclusion rule is strict: every entry must be publicly checkable and load-bearing in the solution. The live register identifies publisher, edition, language, official URL, what the source contains, what in Fursah depends on it, and the source files it constrains. Structured JSON and CSV exports are available from fursah.org/api/knowledge-base."), table([[p("Representative source","CellHead"),p("Contribution","CellHead"),p("Official location","CellHead")]] + [[p(a,"CellX"),p(b,"CellX"),p(c,"CellX")] for a,b,c in SOURCES], [48*mm,76*mm,49*mm]), Spacer(1,8), p("Review package fields", "H2X"), p("The JSON export additionally carries the complete Y.3172 pipeline, all 13 dimension assessments and all policy recommendations. This makes the contribution reusable and machine-reviewable rather than a list of links embedded only in prose."), p("Quality controls", "H2X"), p("The repository verification suite asserts seven unique pipeline identifiers, 13 ordered dimensions, explicit limitations, implementation evidence for every covered dimension, HTTPS source URLs, substantive source descriptions, and operational policy fields. Privacy, evidence and role-scoped assistant verification run separately."), PageBreak()]

    story += [p("Criterion 4 - Input to AI strategy and policy", "H1X"), p("Each recommendation below comes from a constraint encountered while building the prototype. It names an accountable public-sector owner, a trigger for application and a measurable outcome. Detailed rationale and review cadence are published at fursah.org/standards#gaps."), table([[p("Encountered gap","CellHead"),p("Accountable owner","CellHead"),p("Operational trigger","CellHead"),p("Success measure","CellHead")]] + [[p(a,"CellX"),p(b,"CellX"),p(c,"CellX"),p(d,"CellX")] for a,b,c,d in POLICIES], [36*mm,42*mm,48*mm,47*mm]), Spacer(1,8), p("Policy position", "H2X"), p("Employment-adjacent AI should be governed by effective use, not product labels. If a ranking is used to exclude candidates without documented review, it functions as an automated decision even when called advisory. Fursah therefore recommends an operational threshold based on review evidence, override rates, appeals and suspension when controls are absent."), PageBreak()]

    story += [p("Evaluation scenarios and controls", "H1X")]
    scenarios = [
        ("Commercial capture", "Sponsored employers or courses must be labeled, excluded from scores and auditable; suspend ranking if separation fails."),
        ("Inferred-attribute advertising", "Prohibit inferred readiness, disability or socioeconomic signals from advertising; stop sharing and escalate under PDPL."),
        ("Potential disparate impact", "Use separately governed audit data, investigate proxies and thresholds, document remediation, and suspend when necessary."),
        ("Automation bias", "Require written review for exclusions, monitor unusually low override rates and retrain reviewers."),
        ("Non-standard candidate", "Accept portfolios and practical evidence, describe low scores as evidence gaps, and provide appeal and override routes."),
        ("Small cohorts", "Suppress groups below five, withhold statistics and prevent complementary disclosure through partitioning."),
    ]
    story += [table([[p("Scenario","CellHead"),p("Pre-agreed response","CellHead")]] + [[p(a,"CellX"),p(b,"CellX")] for a,b in scenarios], [48*mm,125*mm]), Spacer(1,8), p("Verification evidence", "H2X"), p("The current suites pass privacy suppression, assistant context boundaries, evidence approval rules, reviewer attribution and submission completeness. Live behavioral assistant verification succeeded in the deployed prototype. Local behavioral probes remain environment-dependent because deployment secrets are intentionally not copied into the repository."), p("What remains external", "H2X"), p("Independent accessibility audit, governed pilot outcomes, expert validation of scoring weights, lawful fairness-audit data and approval of production hosting arrangements cannot be self-certified by the team. They are explicitly presented as validation work, not prototype achievements."), PageBreak()]

    story += [p("Judge demonstration - one proof chain", "H1X")]
    steps = [
        ("1", "Open fursah.org/judge-demo and select Abdullah Al-Ghamdi from prepared accounts."),
        ("2", "Reconstruct 36/100 from the five weighted readiness components."),
        ("3", "Ask why the score is what it is; confirm the response repeats displayed facts and declares its model/grounding versions."),
        ("4", "Switch to Administrator; review AI extraction proposals, human verification and reviewer attribution."),
        ("5", "Inspect appeals, overrides, cohort suppression and the operational Y.3172 trace in Governance."),
        ("6", "Use employer and university accounts to follow skill demand into curriculum action."),
    ]
    story += [table([[p("Step","CellHead"),p("Live evidence","CellHead")]] + [[p(a,"CellX"),p(b,"CellX")] for a,b in steps], [15*mm,158*mm]), Spacer(1,9), p("System truth boundary", "H2X"), table([[p("Generative AI may","CellHead"),p("Generative AI may not","CellHead"),p("Humans retain","CellHead")],[p("Propose fields from evidence and explain authorized platform facts.","CellX"),p("Calculate scores, rank people, verify evidence, change career direction, invent metrics or expose another role's data.","CellX"),p("Evidence approval, hiring, curriculum decisions, appeals, overrides and production-risk acceptance.","CellX")]], [57.5*mm]*3), Spacer(1,12), p("Submission links", "H2X"), p("Prototype: https://fursah.org | Judge route: https://fursah.org/judge-demo | Standards: https://fursah.org/standards | Knowledge base: https://fursah.org/knowledge-base | Repository: https://github.com/Shoug-Alomran/AI-Powered-Workforce-Readiness-Ecosystem"), p("Contact", "H2X"), p("Team Visionary | support@fursah.org | Riyadh, Saudi Arabia"), Spacer(1,10), HRFlowable(width="100%", thickness=1, color=BLUE), Spacer(1,7), p("Closing statement", "H2X"), p("Fursah does not ask a judge to trust a black box. It asks the judge to inspect a pipeline, reconstruct a score, challenge an explanation, follow a human decision, and reuse the policy evidence behind it." )]
    doc.build(story, onFirstPage=page_frame, onLaterPages=page_frame)
    return path


def build_handout():
    path = OUT / "fursah-judge-handout.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=14*mm, leftMargin=14*mm, topMargin=12*mm, bottomMargin=15*mm, title="Fursah Judge Handout")
    story = [p("FURSAH | JUDGE HANDOUT", "Kicker"), p("Explainable AI for workforce readiness", "TitleX"), p("One shared skill language connecting students, employers and universities - with deterministic scores, bounded generative AI and human authority.", "Deck"), metric_row([("7/7","Y.3172 nodes"),("13/13","dimensions assessed"),("17","authentic sources")]), Spacer(1,7)]
    story += [p("The proof chain", "H1X"), table([[p("1","CellHead"),p("2","CellHead"),p("3","CellHead"),p("4","CellHead")],[p("Evidence is extracted as a proposal.","CellX"),p("A human verifies before trust.","CellX"),p("Published rules calculate readiness and fit.","CellX"),p("A grounded model explains; humans decide.","CellX")]], [44*mm]*4), Spacer(1,7)]
    story += [p("Why it fits the official criteria", "H1X"), table([[p("Criterion","CellHead"),p("Inspectable contribution","CellHead")],[p("Y.3172","CellX"),p("SRC, C, PP, M, P, D and SINK mapped to running components, source files and governing instruments.","CellX")],[p("AI Readiness","CellX"),p("All 13 dimensions honestly marked Addressed, Partial or Out of scope, with evidence and limitations.","CellX")],[p("Knowledge base","CellX"),p("17 load-bearing sources with publisher links, implementation consequences and JSON/CSV exports.","CellX")],[p("Policy input","CellX"),p("Six encountered gaps with accountable owners, triggers, metrics and review cadence.","CellX")]], [35*mm,141*mm]), Spacer(1,7)]
    story += [p("Three-minute route", "H1X"), p("1. Open fursah.org/judge-demo.  2. Select Abdullah Al-Ghamdi.  3. Reconstruct 36/100.  4. Ask the grounded assistant.  5. Switch to Administrator for evidence review and governance.  6. Follow employer demand into university action."), p("What is not claimed", "H2X"), p("Demo accounts are synthetic. Fursah does not claim placement impact, independent fairness validation, accessibility certification or production hosting approval. Those require governed external evaluation."), p("Open the evidence", "H2X"), p("fursah.org/judge-demo | fursah.org/standards | fursah.org/knowledge-base | github.com/Shoug-Alomran/AI-Powered-Workforce-Readiness-Ecosystem"), p("Team Visionary", "H2X"), p("Shoug Alomran, Lolwah Alsaadoun, Renad Alsulaiman, Taleen Bin Nader | support@fursah.org | Riyadh")]
    doc.build(story, onFirstPage=page_frame, onLaterPages=page_frame)
    return path


if __name__ == "__main__":
    print(build_report())
    print(build_handout())
