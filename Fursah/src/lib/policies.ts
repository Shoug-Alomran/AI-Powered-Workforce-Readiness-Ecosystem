// ---------------------------------------------------------------------------
// Fursah platform policies
// ---------------------------------------------------------------------------
// These are the published, binding statements of how the platform handles
// personal data and automated decisions. They are written against what the
// codebase actually does, and the specific numbers in them are load-bearing:
//
//   - scoring weights          -> WEIGHTS and computeJobMatch in src/lib/ai.ts
//   - cohort suppression       -> MIN_COHORT in src/lib/cohort.ts
//   - consent purposes         -> PURPOSES in src/app/student/privacy/page.tsx
//   - data request types       -> DataRequest.type in prisma/schema.prisma
//   - appeal subjects          -> Appeal.subjectType in prisma/schema.prisma
//   - upload limits and types  -> DOCUMENT_ACCEPT / MAX_BYTES in src/lib/documents.ts
//   - session lifetime         -> setSessionUserId in src/lib/session.ts
//   - LLM provider and model   -> DEFAULT_ASSISTANT_MODEL in src/lib/assistant/llm.ts
//   - assistant history depth  -> MAX_HISTORY_TURNS in src/lib/assistant/llm.ts
//   - extraction fields sent   -> EvidenceAIExtraction in src/lib/evidence-ai.ts
//   - role scoping guarantee   -> scripts/verify-assistant.ts
//
// If you change any of those, change the matching clause here in the same
// commit. A policy that no longer describes the system is worse than none:
// under PDPL it is an inaccurate privacy notice, not merely stale copy.
// ---------------------------------------------------------------------------

export type PolicyClause = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicyDocument = {
  title: string;
  version: string;
  effective: string;
  updated: string;
  summary: string;
  clauses: PolicyClause[];
  attachment?: { label: string; body: string; href: string };
};

const CONTROLLER =
  "Fursah AI (“Fursah”, “we”, “us”), Riyadh, Kingdom of Saudi Arabia";
// Must match the address published in the report and the site footer: a
// privacy notice naming a different address than the rest of the platform
// gives a data subject two routes and no assurance either is monitored.
const CONTACT = "info@fursah.org";
const EFFECTIVE = "19 August 2026";

// ---------------------------------------------------------------------------

const PRIVACY: PolicyDocument = {
  title: "Privacy Policy",
  version: "2.0",
  effective: EFFECTIVE,
  updated: EFFECTIVE,
  summary:
    "This policy explains what personal data Fursah collects, why we are permitted to process it, who receives it, how long we keep it, and the rights you can exercise over it. It is written to meet the Personal Data Protection Law of the Kingdom of Saudi Arabia (Royal Decree M/19, as amended by M/148) and its Implementing Regulations.",
  clauses: [
    {
      heading: "1. Who is responsible for your data",
      paragraphs: [
        `The data controller is ${CONTROLLER}. We determine the purposes and means of processing personal data on this platform and are accountable for it under the Personal Data Protection Law (“PDPL”).`,
        `Privacy enquiries, rights requests, and complaints may be sent to ${CONTACT}. We aim to acknowledge within five working days and to resolve within thirty days, which is the period the Implementing Regulations allow for responding to a data-subject request.`,
        "Where a university or employer uses Fursah to manage its own recruitment or advising process, that institution acts as an independent controller for the decisions it makes. Fursah remains controller for the platform, the scoring engine, and the records described in this policy.",
      ],
    },
    {
      heading: "2. Personal data we collect",
      paragraphs: [
        "We collect only what is needed to operate the readiness, matching, verification, and institutional-reporting functions of the platform. Categories are:",
      ],
      bullets: [
        "Account data: your name, email address, assigned role (student, employer, university, or administrator), account status, and the date the account was created.",
        "Student profile data: your target career, degree, institution, and an optional short biography that you write yourself.",
        "Competence data: the skills you list and the proficiency level you claim for each (a 1–5 scale), certifications, work and volunteer experience with duration, and projects.",
        "Evidence files: documents you upload to support a certification, project, or experience, including the original filename, file type, size, and the outcome of automated file checks and human review.",
        "Activity data: applications you submit and their status, jobs you bookmark, employers and career tracks you follow, and the roadmap items generated for you or added by you.",
        "Governance records: your purpose-specific consent choices and their version, appeals you raise, data requests you make, support tickets you open, and notifications sent to you.",
        "Outcome data: structured feedback an employer records after a placement, across technical skill, communication, teamwork, problem-solving, adaptability, and an overall rating.",
        "Technical data: an authentication session cookie, and server logs generated in the ordinary course of operating a web service.",
      ],
    },
    {
      heading: "3. Personal data we deliberately do not collect",
      paragraphs: [
        "Fursah does not collect your national identity number, date of birth, gender, nationality, tribal or family affiliation, marital status, health or disability information, religious affiliation, or political opinion. No field for any of these exists in our data model.",
        "This is a design commitment, not merely a current state. Because these attributes are never collected, they cannot enter a readiness score or a match ranking, and they cannot be inferred back out of a score we did not build from them. Any proposal to collect a special-category attribute would require a documented lawful basis and a Data Protection Impact Assessment before a field is added.",
        "We do not collect Grade Point Average. Screening on institution prestige or grade average is one of the specific harms the platform exists to reduce.",
      ],
    },
    {
      heading: "4. Why we process your data, and our lawful basis",
      paragraphs: [
        "Under the PDPL we must have a lawful basis for each purpose. Ours are:",
      ],
      bullets: [
        "To provide the service you asked for: calculating your readiness score, showing your gaps, matching you to opportunities, and carrying your applications to employers. Basis: performance of the service you have requested.",
        "To verify evidence you submit, so that a claimed skill or certification means something to an employer. Basis: performance of the service, and our legitimate interest in the integrity of the platform.",
        "To share approved evidence with an employer reviewing your application. Basis: your consent, given per purpose and withdrawable at any time.",
        "To send you notifications about opportunities matching employers and career tracks you follow. Basis: your consent.",
        "To improve the recommendation logic using de-identified employment outcomes. Basis: your consent.",
        "To produce aggregate, non-identifying reporting for universities and for national workforce planning. Basis: legitimate interest, exercised only on data that has been aggregated and suppressed as described in clause 7.",
        "To keep security, audit, and accountability records, and to respond to rights requests and appeals. Basis: compliance with our legal obligations under the PDPL.",
      ],
    },
    {
      heading: "5. Consent, and what happens when you withdraw it",
      paragraphs: [
        "Consent on Fursah is specific rather than bundled. Three purposes are separately controlled from your privacy settings: sharing verified evidence with employers, using anonymised outcomes to improve recommendations, and personalised opportunity notifications. Each is recorded with its own timestamp and policy version.",
        "You may withdraw any consent at any time, and withdrawal is as easy as giving it: a single control in the same screen. Withdrawal takes effect immediately for future processing. It does not make past lawful processing unlawful, and it does not retract a document an employer has already lawfully viewed.",
        "Refusing or withdrawing consent does not disable your account, your readiness score, or your ability to apply for opportunities. Consent-based purposes are additional to the core service, never a condition of it. We do not use pre-ticked boxes, and we do not treat silence or inactivity as consent.",
      ],
    },
    {
      heading: "6. Who receives your data",
      paragraphs: [
        "We do not sell personal data. We do not disclose personal data for advertising, and we do not permit any third party to use data obtained through Fursah to profile you for advertising purposes.",
        "Your data is disclosed only in these circumstances:",
      ],
      bullets: [
        "To an employer, when you apply to their opportunity: your profile, your match score, and the explanation behind it. Supporting evidence is included only if you have granted the employer-evidence consent.",
        "To a holder of a sharing link you created yourself. Passport links are time-limited, carry an expiry date you set, and can be revoked by you at any moment, which invalidates the link immediately.",
        "To your university, only in aggregate form and subject to the suppression rule in clause 7. A university does not receive named student records or per-student scores through institutional reporting.",
        "To service providers who process data on our instructions under written agreement: Google Firebase Authentication for sign-in, Cloudflare R2 for encrypted storage of evidence files, Cloudflare Workers AI for the language-model processing described in clause 6a, and Vercel for application hosting. They may not use your data for their own purposes.",
        "To a competent authority where we are legally required to disclose, and to the extent required.",
      ],
    },
    {
      heading: "6a. Language-model processing",
      paragraphs: [
        "Two features send personal data to a language model, and we describe them specifically rather than under a general reference to “AI processing”.",
      ],
      bullets: [
        "Evidence extraction: when you upload a certificate, project, or experience document, its contents are sent for structured extraction — document type, title, issuer, the name the document was issued to, dates, and the skills it evidences, each with a confidence value and the text supporting it. The result is a proposal for a human reviewer, never an automatic approval.",
        "The in-platform assistant: when you ask it a question, it receives a prepared set of facts scoped to your own role, together with your question and up to six previous turns of that conversation.",
      ],
    },
    {
      heading: "6b. Limits on that processing",
      paragraphs: [
        "The model does not compute your readiness score or your match score. Those remain deterministic and rule-based, exactly as published in the Responsible AI Policy, so that every number affecting you stays reconstructible. The model extracts, summarises, and explains; it does not rank people.",
        "The facts supplied to the assistant are scoped by role before they leave our systems. A university's assistant receives only aggregate, suppression-filtered data and cannot be given an individual student's record, and this boundary is enforced by an automated check that runs against the context builder rather than by instruction to the model alone.",
        "We use Cloudflare Workers AI. Your data is processed to answer your request and is not used by us or by the provider to train models.",
        "Language models can be wrong. Extracted details are a proposal you and a human reviewer can correct, and assistant answers are explanatory rather than authoritative. Where an extraction is wrong, correcting it is a data-correction right under clause 11, not a support request.",
      ],
    },
    {
      heading: "7. Aggregate reporting and the suppression threshold",
      paragraphs: [
        "Universities and national-planning views receive statistics, not students. Aggregate reporting excludes names, email addresses, and per-person scores by construction.",
        "Aggregation alone is not anonymity. A “readiness band distribution” across three students identifies all three. Fursah therefore enforces a minimum cohort size of five: where fewer than five students fall within a reporting group, the platform suppresses the figures entirely and states that the cohort is too small to report, rather than publishing a re-identifying statistic.",
      ],
    },
    {
      heading: "8. Evidence files and their handling",
      paragraphs: [
        "Evidence documents are stored in private object storage, are not publicly addressable, and are served only to users authorised to see them. Uploads are limited to 25 MB and to a defined list of document, image, and media formats; executable and macro-enabled file types are rejected.",
        "Automated checks screen an upload before a human reviewer sees it. These checks flag a file for closer inspection; they do not by themselves approve or reject your evidence. Approval or rejection of evidence is always a human decision, recorded with the reviewer's identity and the time of review.",
      ],
    },
    {
      heading: "9. International transfer",
      paragraphs: [
        "Fursah is designed to be operated from a hosting region inside the Kingdom, consistent with national data-classification and cloud-hosting rules and with the Regulations on Personal Data Transfers outside the Kingdom.",
        "We state plainly that the current prototype deployment uses infrastructure providers whose storage and hosting regions are not yet pinned to the Kingdom. This is a known limitation of the prototype and is disclosed here rather than omitted. Before the platform processes real student records at any scale, hosting and storage will be bound to a compliant in-Kingdom region, and any residual transfer will be assessed and documented as the Regulations require.",
        "The same applies, and applies most sharply, to the language-model processing in clause 6a: inference runs on the provider's distributed network rather than in a region we currently pin. Evidence documents are the most sensitive data the platform holds, so this is the first transfer we will bring inside the Kingdom. Until it is, the extraction feature can be disabled for any institution that requires it, and the platform continues to function without it — evidence is then reviewed by a human without a machine-generated proposal.",
      ],
    },
    {
      heading: "10. Retention",
      paragraphs: [
        "We keep personal data only as long as the purpose it was collected for requires.",
      ],
      bullets: [
        "Profile, competence, and evidence data: retained while your account is active, and deleted or de-identified when you close your account or a deletion request is completed.",
        "Applications and their outcomes: retained while the application is live and for a limited period afterwards so that appeals remain reviewable.",
        "Authentication sessions: the session cookie expires thirty days after it is issued.",
        "Audit, consent, appeal, and data-request records: retained for the period we must be able to demonstrate accountability, because deleting the record of a decision would defeat the purpose of logging it. These records are minimised and are not used to build a profile of you.",
      ],
    },
    {
      heading: "11. Your rights",
      paragraphs: [
        "The PDPL gives you rights over your personal data, and the platform implements them as working features rather than as an email address to write to. From your data-rights screen you may:",
      ],
      bullets: [
        "Be informed: this policy, and the explanation shown with every automated result.",
        "Access: request confirmation of what we hold about you.",
        "Obtain a copy: request your data in a readable, portable form.",
        "Request correction: ask us to rectify data that is inaccurate, incomplete, or out of date.",
        "Request deletion: ask us to erase your personal data where we have no overriding legal reason to retain it.",
        "Withdraw consent: for any purpose you previously allowed.",
        "Object to a solely automated decision, and require human review, as set out in the Responsible AI Policy.",
      ],
    },
    {
      heading: "12. Complaints",
      paragraphs: [
        `If you believe we have handled your personal data unlawfully, contact us first at ${CONTACT} so that we can investigate. You also have the right to lodge a complaint directly with the Saudi Data & Artificial Intelligence Authority (SDAIA) as the competent supervisory authority, and doing so does not require you to come to us first.`,
      ],
    },
    {
      heading: "13. Security",
      paragraphs: [
        "We apply role-based access control, encrypted transport, private storage for evidence files, and audit logging of consequential actions. Access to personal data within Fursah is restricted to the role that needs it for a defined purpose.",
        "No system is perfectly secure. If a personal-data breach occurs that is likely to cause harm, we will notify SDAIA and affected individuals in accordance with the notification periods set out in the Implementing Regulations.",
      ],
    },
    {
      heading: "14. Children",
      paragraphs: [
        "Fursah is built for university-level students and adult professionals and is not directed at children. We do not knowingly create accounts for individuals below the age of majority without the verified consent of a guardian. If we learn that we hold such an account without proper authority, we will delete it.",
      ],
    },
    {
      heading: "15. Changes to this policy",
      paragraphs: [
        "We version this policy and record the version against your consent choices, so that it is always possible to establish which text you agreed to. Where a change materially affects how we use your data, we will notify you and, where the change requires it, ask for fresh consent rather than relying on the old one.",
      ],
    },
    {
      heading: "16. Prototype status",
      paragraphs: [
        "Fursah is currently a prototype. Parts of the platform run on demonstration data, and some figures displayed in the interface are illustrative rather than measured. This policy describes how we handle real personal data wherever the platform processes it, and we have not softened any statement on the basis that the system is a prototype.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const RESPONSIBLE_AI: PolicyDocument = {
  title: "Responsible AI Policy",
  version: "2.0",
  effective: EFFECTIVE,
  updated: EFFECTIVE,
  summary:
    "Fursah produces automated readiness scores and candidate–role match rankings that influence education and employment decisions. This policy states how those systems work, what they may and may not be used for, how they are monitored, and how you contest a result. It is written against SDAIA's Principles and Controls of AI Ethics and treats employment-facing AI as high-risk.",
  clauses: [
    {
      heading: "1. Risk classification",
      paragraphs: [
        "We classify Fursah as a high-risk AI system. It supports decisions about access to employment and to education pathways, which is the category treated as high-risk both under SDAIA's four-tier risk classification and, internationally, under Annex III of the EU AI Act.",
        "We adopt that classification voluntarily and hold ourselves to the obligations attached to it: documented risk management, human oversight, transparency to the affected person, record-keeping, and continuous monitoring. We do not rely on the platform's prototype status to claim a lower tier.",
      ],
    },
    {
      heading: "2. What the system actually is",
      paragraphs: [
        "Honesty about the mechanism is part of explainability, so we state it plainly. Fursah has two distinct components, and the boundary between them is the most important design decision in the platform.",
        "Everything that produces a number about a person — the Career Readiness Score, the gap analysis, and the candidate–role match — is a deterministic, rule-based scoring system with published weights. It is not a machine-learning model trained on historical hiring decisions.",
        "This is a deliberate architectural choice. A model trained on past hiring outcomes learns past hiring preference, including its inequities. A weighted rule engine cannot silently acquire a bias from history, because it has no history to learn from; its inputs are the skills, certifications, experience, and projects a candidate can evidence, and its weights are visible, versioned, and auditable.",
        "The trade-off is that the engine cannot discover patterns nobody encoded. We accept that limitation in exchange for a system whose every output can be reconstructed and challenged.",
      ],
    },
    {
      heading: "2a. Where the language model sits, and where it does not",
      paragraphs: [
        "The platform also uses a general-purpose language model, and we are specific about its role because a vague claim of “AI-powered” would obscure exactly what a reader of this policy needs to know.",
        "The model does two things: it extracts structured details from evidence documents you upload, and it answers questions in the in-platform assistant. It does not compute any score, does not rank candidates, and does not decide whether evidence is accepted.",
        "Both uses are grounded. The model is given facts already produced by the deterministic engine and is instructed to answer only from them; it is not asked to reason about a person from raw data. Its extraction output is a proposal carrying a confidence value and the supporting text, submitted to a human reviewer who accepts or rejects it.",
        "This division is deliberate. Language models are well suited to reading a document and explaining a result, and poorly suited to being the reason a person did or did not get an opportunity. Placing the model on the explanatory side of the boundary keeps every consequential number reconstructible, which is the property the rest of this policy depends on.",
        "The assistant's access to data is scoped by role before any request leaves our systems, and that boundary is enforced by an automated verification run against the context builder — including an assertion that a university's assistant can never be supplied with an individual student's record. We test the boundary rather than trusting the instruction.",
        "Any future introduction of a learned component into scoring itself would require bias auditing and a published impact assessment before deployment.",
      ],
    },
    {
      heading: "3. The weights we score on",
      paragraphs: [
        "We publish the weightings rather than describing them in general terms. A Career Readiness Score is composed of:",
      ],
      bullets: [
        "Technical skills matched against the target career track: 35%.",
        "Certifications held, counting only those verified: 20%.",
        "Relevant experience, measured in months against the track's recommended duration: 20%.",
        "Soft skills matched against the track: 15%.",
        "Projects evidencing applied work: 10%.",
      ],
    },
    {
      heading: "4. How a match score is composed",
      paragraphs: [
        "A candidate–role match score is composed of required skills at 55%, required certifications at 25%, and experience against the role's stated minimum at 20%. Within the skills component, requirements the employer marked essential carry 80% and preferred requirements 20%, so a candidate is not penalised for lacking a nice-to-have as though it were a prerequisite.",
        "Scores are banded for interpretation: 80 and above is presented as Career Ready, 55 to 79 as Developing, and below 55 as Early Stage. A band is a description of evidence on file, never a statement about a person's ability or worth.",
      ],
    },
    {
      heading: "5. Every result carries its reasoning",
      paragraphs: [
        "No score is displayed without an accompanying explanation. A Reasoning Card names which required skills were matched and which were missing, which certifications are absent, and how many months of experience separate the candidate from the stated minimum.",
        "Explanation is generated as part of scoring rather than reconstructed afterwards. This matters: a post-hoc rationalisation can be plausible and still not be the actual reason for the output. Because the engine is rule-based, the explanation and the computation are the same object.",
        "Consequential actions are written to an audit log recording the actor, the action, the entity affected, the version of the model or ruleset applied, and the explanation given at the time. This is what makes a past decision reviewable rather than merely remembered.",
      ],
    },
    {
      heading: "6. Human oversight, and what would defeat it",
      paragraphs: [
        "Fursah is decision-support. Its outputs are advisory inputs to a decision an accountable person makes. No student is rejected, shortlisted, or graded by the platform alone.",
        "We recognise the most likely quiet failure of this design: human review that has become a rubber stamp. A reviewer who approves every recommendation provides oversight in name only, and the system then makes consequential decisions while appearing not to.",
        "We therefore treat override and disagreement rates as monitored indicators rather than incidental statistics. An anomalously low override rate is investigated as a warning sign, not welcomed as agreement. Reviewers are trained to read a Reasoning Card as something to interrogate, not as reassurance that the answer is already correct.",
      ],
    },
    {
      heading: "7. Your right to contest a result",
      paragraphs: [
        "You may challenge any automated output that affects you, and you do not need to show that it is wrong before you are entitled to a review. Four categories can be appealed: a readiness score, a job match, an evidence decision, and a data use or correction.",
        "An appeal goes to a human reviewer, whose decision overrides the model's output. The outcome is recorded with the reviewer's identity, the resolution reached, and the time it was made.",
        "Where a review reveals that the engine handled a legitimate form of evidence badly, the correction is fed back into the taxonomy and the rules, so that the next candidate in the same position is not failed the same way.",
      ],
    },
    {
      heading: "8. Fairness",
      paragraphs: [
        "Protected characteristics are excluded from ranking inputs. As set out in the Privacy Policy, they are not collected at all, which is a stronger guarantee than excluding them at scoring time.",
        "Excluding an attribute does not exclude a proxy for it. Institution name, region, and career interruption can all stand in for characteristics we never collect. We therefore monitor outcomes for uneven impact across institution and region, and treat a disparity we cannot explain by evidence of skill as a defect in the system rather than a fact about the candidates.",
        "Employers may enable blind review on an opportunity, which withholds identifying details from the reviewer at the screening stage.",
        "A low score means the evidence on file is incomplete, and the interface is required to say so in those terms. A candidate who is self-taught, who trained through a bootcamp, or who is returning after an interruption may hold real competence the pipeline was not built to read. Alternative evidence (portfolio, practical assessment, employer attestation) feeds the same taxonomy for exactly this reason.",
      ],
    },
    {
      heading: "9. Monitoring",
      paragraphs: [
        "The platform records monitoring snapshots against each model version, capturing sample size, average score, realised outcome rate, score drift, and outcome drift, and assigns a status of healthy, watch, paused, or insufficient data.",
        "Drift is measured against realised employment outcomes, not against the system's own past predictions, because a model can be perfectly consistent with itself and steadily further from reality. Where safeguards fail, the correct response is to pause or roll back the ruleset, and the monitoring model carries a paused state so that this is an available action rather than a hypothetical one.",
      ],
    },
    {
      heading: "10. Separation of commercial interest from ranking",
      paragraphs: [
        "This clause binds us in advance, before there is any commercial pressure to reason around it.",
        "Ranking is never for sale. Fursah will not accept payment from an employer for improved visibility within match results, and will not accept payment from a training provider for placement inside a student's gap analysis or roadmap.",
        "Should sponsored content ever appear on the platform, it must be labelled as such, must be visually distinct from evidence-based recommendations, and must be excluded from the match computation entirely. Because a Reasoning Card must disclose every input that produced a recommendation, a commercial input could not be introduced quietly; it would either appear in the explanation or make the explanation false.",
        "Breach of this clause triggers suspension of the commercial feature and remediation under this policy.",
      ],
    },
    {
      heading: "11. Prohibited uses",
      paragraphs: [
        "The following are prohibited on Fursah, by us and by any institution using it:",
      ],
      bullets: [
        "Using a readiness score or match score as the sole basis for rejecting a candidate or denying access to a programme.",
        "Using inferred signals (readiness weaknesses, gap patterns, socioeconomic or accessibility proxies) for advertising, for targeting, or for any form of profiling unrelated to the purpose for which the data was given.",
        "Disclosing platform data to a third party for advertising or profiling, under any commercial arrangement.",
        "Re-identifying individuals from aggregate institutional reporting, or combining aggregates to defeat the suppression threshold.",
        "Presenting a score to a candidate without its accompanying explanation.",
        "Using the platform to rank candidates on any attribute this policy and the Privacy Policy exclude.",
      ],
    },
    {
      heading: "12. Escalation",
      paragraphs: [
        "Where a breach of this policy involves personal data or a discriminatory outcome, our response is not limited to internal correction. We will suspend the offending feature, notify affected individuals through the platform, revoke any third-party data sharing involved, and refer the matter to SDAIA and to the relevant sector regulator where the breach warrants it.",
        "Individuals affected retain, at all times and independently of anything we do, the right to withdraw consent and to request deletion of their data through their own privacy controls.",
      ],
    },
    {
      heading: "13. Governance and review",
      paragraphs: [
        "This policy is reviewed at least annually and whenever the scoring logic, weights, or data inputs change materially. The specific figures published in clauses 3 and 4 are versioned with the engine, so that a score computed last quarter can be interpreted against the rules that actually produced it.",
        "Governance scenarios raised against the platform are recorded with the risk level, the issues detected, the action proposed, and the human decision reached, including where a human overrode the proposed action, since an oversight mechanism that never disagrees is not evidence of oversight.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const TERMS: PolicyDocument = {
  title: "Terms of Use",
  version: "2.0",
  effective: EFFECTIVE,
  updated: EFFECTIVE,
  summary:
    "These terms govern your use of the Fursah platform. They set out what the service does and does not promise, the obligations of students, employers, and universities, and how disputes are resolved.",
  clauses: [
    {
      heading: "1. Agreement",
      paragraphs: [
        `These terms form an agreement between you and ${CONTROLLER}. By creating an account or using the platform you accept them. If you use Fursah on behalf of a university or employer, you confirm you are authorised to bind that institution.`,
      ],
    },
    {
      heading: "2. What Fursah is",
      paragraphs: [
        "Fursah is a decision-support platform connecting students, employers, and universities through evidence-based readiness scoring and opportunity matching. It provides information and analysis to help people make decisions. It does not make those decisions.",
      ],
    },
    {
      heading: "3. What Fursah does not promise",
      paragraphs: [
        "We state these limits directly rather than burying them, because the platform concerns people's livelihoods:",
      ],
      bullets: [
        "A readiness score is not a prediction of your job performance, your intelligence, or your potential. It describes the evidence currently on your profile, measured against one career track.",
        "A high score does not guarantee an interview, an offer, admission, certification, or employment. Employers decide independently.",
        "A low score is not a judgement of your capability. It most often means evidence is missing, not that competence is.",
        "A match percentage expresses fit between recorded evidence and stated requirements. It is not a ranking of people.",
        "Aggregate institutional analytics are indicative, depend on the completeness of the underlying data, and are not a substitute for an institution's own accreditation processes.",
      ],
    },
    {
      heading: "4. Your account",
      paragraphs: [
        "You must provide accurate information, keep your credentials secure, and not share your account. You are responsible for activity under your account. Notify us promptly at " +
          CONTACT +
          " if you believe it has been accessed without your authority.",
      ],
    },
    {
      heading: "5. Honest evidence",
      paragraphs: [
        "The platform's value rests entirely on evidence meaning what it claims to mean. You must not upload evidence that is fabricated, altered, or belongs to another person, claim skills, certifications, or experience you do not hold, or misrepresent the duration or nature of your experience.",
        "Submitting falsified evidence is grounds for immediate removal of the affected claims and, for repeated or serious cases, suspension of the account. Where falsified evidence has already been shown to an employer, we may inform that employer that the evidence has been withdrawn.",
      ],
    },
    {
      heading: "6. Obligations of employers",
      paragraphs: [
        "Employers using Fursah agree that:",
      ],
      bullets: [
        "A match score will not be the sole basis for rejecting a candidate. A human reviews before any consequential decision.",
        "Stated role requirements will be genuine requirements, not filters designed to exclude.",
        "Candidate data obtained through the platform will be used only to assess that candidate for the opportunity applied to, and not retained, resold, or repurposed for advertising or profiling.",
        "Evidence viewed under a student's consent will not be redistributed beyond the reviewing team.",
        "Feedback recorded after a placement will be given in good faith, since it feeds back into the platform's outcome monitoring.",
      ],
    },
    {
      heading: "7. Obligations of universities",
      paragraphs: [
        "Universities receive aggregate reporting subject to the minimum-cohort suppression rule described in the Privacy Policy. Institutions must not attempt to re-identify individuals from aggregate figures, combine reports to defeat the suppression threshold, or use platform analytics to disadvantage an identifiable student.",
      ],
    },
    {
      heading: "8. Acceptable use",
      paragraphs: ["You must not:"],
      bullets: [
        "Manipulate scores, rankings, evidence, or feedback, or attempt to reverse-engineer the scoring engine in order to game it. The weights are published in the Responsible AI Policy; you do not need to reverse-engineer them, and using them to inflate unearned claims is a breach of clause 5.",
        "Scrape, harvest, or bulk-extract profiles or opportunity data.",
        "Attempt to access another user's account, data, or evidence, including by guessing or reusing a passport sharing link not issued to you.",
        "Probe, disrupt, or overload the platform's infrastructure.",
        "Use the platform to harass, discriminate against, or defame any person.",
      ],
    },
    {
      heading: "9. Your content",
      paragraphs: [
        "You keep ownership of everything you upload. You grant us the limited licence needed to store, process, display, and share it in the ways this agreement and your consent choices permit, and nothing wider. That licence ends when you delete the content or close your account, subject to the retention rules in the Privacy Policy.",
      ],
    },
    {
      heading: "10. Availability",
      paragraphs: [
        "Fursah is offered on an “as available” basis. As a prototype it may change, contain incomplete or demonstration data, or be temporarily unavailable while it is developed and evaluated. We do not warrant uninterrupted or error-free operation.",
      ],
    },
    {
      heading: "11. Suspension",
      paragraphs: [
        "We may restrict or suspend access where an account is used fraudulently or unlawfully, where it harms other users or the integrity of the platform, or where we are legally required to act. Except where prevented by law or by the seriousness of the conduct, we will explain the reason and provide a route to respond.",
      ],
    },
    {
      heading: "12. Liability",
      paragraphs: [
        "To the extent permitted by law, Fursah is not liable for hiring, admission, or curriculum decisions made by employers or universities, for outcomes arising from evidence a user misrepresented, or for indirect or consequential loss. Nothing in these terms excludes liability that cannot lawfully be excluded, including liability under the PDPL for our own processing.",
      ],
    },
    {
      heading: "13. Governing law",
      paragraphs: [
        "These terms are governed by the laws of the Kingdom of Saudi Arabia, and the competent courts of the Kingdom have jurisdiction over any dispute. Your rights and remedies under the PDPL, including your right to complain to SDAIA, are unaffected by this clause.",
      ],
    },
    {
      heading: "14. Changes",
      paragraphs: [
        "We version these terms and will give notice of material changes. Continued use after a change takes effect indicates acceptance; if you do not accept, you may close your account and request deletion of your data.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const ACCESSIBILITY: PolicyDocument = {
  title: "Accessibility Statement",
  version: "2.0",
  effective: EFFECTIVE,
  updated: EFFECTIVE,
  summary:
    "Fursah aims to be usable by everyone, including people with disabilities. This statement sets the standard we hold ourselves to, records where we currently fall short, and tells you how to report a barrier.",
  clauses: [
    {
      heading: "1. Our commitment",
      paragraphs: [
        "A platform that mediates access to employment must be usable by the people it claims to serve. An inaccessible interface does not merely inconvenience a user; on a platform like this one, it excludes them from opportunity. We therefore treat accessibility as a condition of the service working, not as an enhancement to it.",
      ],
    },
    {
      heading: "2. Standard we are working to",
      paragraphs: [
        "We target conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA, which is the level required by the Digital Government Authority's Guideline for Web Accessibility of Government Websites. We track WCAG 2.2 as our forward target as DGA guidance moves toward it.",
      ],
    },
    {
      heading: "3. What we implement",
      bullets: [
        "Keyboard access to interactive controls, with visible focus states.",
        "Semantic structure and labelling so that screen readers can convey meaning, not just text.",
        "Text and interface contrast meeting the AA contrast ratios.",
        "Touch and pointer targets sized for reliable activation.",
        "Responsive layouts that reflow without horizontal scrolling.",
        "Plain language, particularly around scores, gaps, and appeals, where misunderstanding carries real cost.",
        "User-adjustable display preferences within the platform.",
      ],
    },
    {
      heading: "4. Language",
      paragraphs: [
        "Fursah serves an Arabic-first audience. We are progressively delivering full Arabic across the platform, including right-to-left layout, and we regard an English-only screen as an accessibility defect rather than a missing translation.",
      ],
    },
    {
      heading: "5. Known limitations",
      paragraphs: [
        "We publish what is not yet done, because an accessibility statement that lists only successes is marketing:",
      ],
      bullets: [
        "The platform has not yet undergone a full independent WCAG 2.1 AA audit. Our conformance claim is based on internal review and is stated as a target we are working to, not a certified result.",
        "Arabic coverage is partial and still being extended across all portals.",
        "Documents uploaded by users (transcripts, certificates, portfolios) may not themselves be accessible, as we do not control how they were produced. We can accept an accessible alternative on request.",
        "Some data-dense dashboard views are still being improved for screen-reader navigation.",
      ],
    },
    {
      heading: "6. Reporting a barrier",
      paragraphs: [
        `If any part of Fursah is difficult or impossible for you to use, tell us at ${CONTACT}. Include the page, what you were trying to do, and the device or assistive technology you use. We aim to acknowledge within five working days.`,
        "If a barrier prevents you from completing something time-sensitive (submitting an application, responding to an employer, filing an appeal), say so, and we will provide an alternative route so that the deadline does not pass because of our defect.",
      ],
    },
    {
      heading: "7. How we handle accessibility issues",
      paragraphs: [
        "Accessibility issues are logged as product defects, not as feature requests, and are prioritised by their effect on task completion. A barrier that blocks a student from applying for a job is treated as a critical defect.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

export const POLICIES: Record<string, PolicyDocument> = {
  privacy: PRIVACY,
  terms: TERMS,
  "responsible-ai": {
    ...RESPONSIBLE_AI,
    attachment: {
      label: "AI Readiness Report (PDF)",
      body: "The full technical and governance report behind this policy. It maps every stage of the Fursah pipeline (sources, connectivity, pre-processing, models, human oversight, analytics, and interfaces) to SDAIA's Principles and Controls of AI Ethics, the PDPL, national data-governance standards, and the Human Capability Development Programme, and works through the scenarios in which the system could be contested.",
      href: "/fursah-ai-readiness-hackathon-submission.pdf",
    },
  },
  accessibility: ACCESSIBILITY,
};

export const POLICY_SLUGS = Object.keys(POLICIES);
