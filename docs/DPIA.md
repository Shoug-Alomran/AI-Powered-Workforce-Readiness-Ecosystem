# Data Protection Impact Assessment

**Platform:** Fursah — AI Workforce Readiness Platform
**Controller:** Fursah AI, Riyadh, Kingdom of Saudi Arabia · info@fursah.org
**Responsible owner:** Fursah Trust & Safety (`info@fursah.org`)
**Version:** 1.1 · **Date:** 21 August 2026 · **Status:** Prototype assessment
**Next scheduled review:** 21 February 2027, or on any triggering change in §7
**Legal basis for assessment:** Personal Data Protection Law (Royal Decree M/19,
amended by M/148), its Implementing Regulations, and SDAIA guidance on impact
assessment for high-risk processing.

---

## 0. Assessment at a glance

*One page. Every statement below describes behaviour implemented in this
repository; §§1–7 give the full reasoning.*

**What is processed.** Students supply academic background, skills,
certifications, projects, experience and a target career, plus evidence
documents they upload. Employers supply role requirements. Universities supply
course offerings. No gender, nationality, age, GPA, photograph or any other
protected characteristic is collected — the fields do not exist in the schema.

**Where it goes.** Evidence files are stored in private Cloudflare R2 with no
public bucket access. Document contents are sent to Cloudflare Workers AI for
extraction. The role-scoped assistant sends a grounding pack, never a raw
record. Everything else stays in the application database.

**What the AI does, and does not do.** Every number that affects a person —
readiness, skill gaps, candidate–role match — is produced by a deterministic
rule engine with published weights (`src/lib/intelligence/readiness.ts`). No
model is trained on historical hiring outcomes, and no learned component
participates in any score. The language model does exactly two things: it reads
an uploaded document and proposes the skills it evidences, and it explains
results the deterministic layer already produced.

**Human decision points.** Extraction is advisory and confers nothing: a named
reviewer must approve a document before its evidence counts toward any score
(`scripts/verify-evidence.ts` asserts this). Employers receive ranked decision
support and make and record every hiring decision themselves. Any automated
result can be appealed to a named human whose decision supersedes the engine.

**Aggregation and cohort suppression.** Universities receive aggregates only,
never a named student or a per-person score. Suppression applies to every
reporting group, not just the cohort total: any readiness band, career track,
skill gap or certification gap containing fewer than five students is withheld,
and where withholding one group of a partition would let its value be recovered
by subtracting the others, a second group is withheld too
(`src/lib/cohort.ts`, asserted by `scripts/verify-privacy.ts`).

**Data subject rights.** Purpose-specific, separately withdrawable consent;
access, portability, correction and deletion requests; appeals against
readiness, match, evidence and data decisions. All implemented as workflows,
not as promises in a policy.

**Principal risks and their status.**

| Risk | Residual | Status |
|---|---|---|
| Cross-border model inference (R5) | Medium/High | **Blocking for production.** Bind inference in-Kingdom before real personal data |
| Automation bias in human review (R2) | Medium/High | Ongoing: override rates monitored; low rates investigated |
| Proxy discrimination via institution or region (R3) | Medium/High | Accepted with disclosure; needs institutional fairness review |
| Automated exclusion at scale (R1) | Low/High | Ongoing: explanation quality and appeal volume |
| Re-identification, cross-role disclosure, ranking capture, file access (R4, R6, R7, R8) | Low | Controls implemented and verified by script |

**The honest limitation.** Because no protected attribute is collected,
disparate-impact testing cannot be performed on this data. Data minimisation
and demonstrable non-discrimination genuinely conflict here, and no instrument
we could find resolves which takes precedence for an employment-adjacent
system. This is stated publicly at `/standards` rather than left implicit.

---

## 1. Why an assessment is required

The Implementing Regulations require an assessment where processing is likely to
result in high risk to data subjects. Fursah meets that threshold on three
independent grounds:

1. **Systematic evaluation of individuals** producing scores that influence
   access to employment.
2. **Automated processing with a significant effect** — a match score shapes
   whether an employer reviews a candidate at all.
3. **Processing data of a vulnerable group at scale** — students, in an
   asymmetric relationship with the institutions receiving the output.

We additionally classify the platform as **high-risk** under SDAIA's four-tier
classification, consistent with Annex III point 4 of the EU AI Act treating
employment and worker management as high-risk. We do not rely on prototype
status to claim a lower tier.

---

## 2. Description of the processing

### 2.1 Nature

Students build evidence-backed profiles. A deterministic engine computes a
Career Readiness Score and candidate–role match scores from that evidence.
A language model extracts structured details from uploaded documents and
answers questions about results already computed. Universities receive
aggregate reporting; employers receive applications with explanations.

### 2.2 Scope — categories of personal data

| Category | Fields | Source |
|---|---|---|
| Account | Name, email, role, status, creation date | Data subject |
| Student profile | Target career, degree, institution, biography | Data subject |
| Competence | Skills with 1–5 self-declared level, certifications, experience with duration, projects | Data subject |
| Evidence files | Document contents, filename, MIME type, size; extracted issuer, recipient name, dates, skills | Data subject |
| Activity | Applications and status, bookmarks, followed employers and tracks, roadmap items | Generated |
| Governance | Consent records with version, appeals, data requests, support tickets, notifications | Both |
| Outcome | Employer feedback across six dimensions post-placement | Employer |
| Technical | Session cookie (30-day lifetime), server logs | Generated |

### 2.3 Data deliberately not collected

No field exists in the data model for: national identity number, date of birth,
gender, nationality, tribal or family affiliation, marital status, health or
disability data, religious affiliation, political opinion, or Grade Point
Average.

This is the platform's primary bias control, and it is structural rather than
procedural: an attribute that is never collected cannot enter a score, cannot
be inferred back out of a score not built from it, and cannot be leaked by a
misconfigured query. Verifiable against `prisma/schema.prisma`.

### 2.4 Context

Data subjects are predominantly university students in Saudi Arabia. The
relationship is asymmetric: the student supplies the data, and universities and
employers act on the output. Students are unlikely to be in a position to
negotiate terms, which raises the standard for consent quality and for the
availability of a genuine appeal route.

### 2.5 Purposes and lawful bases

| Purpose | Lawful basis |
|---|---|
| Readiness scoring, gap analysis, matching, applications | Performance of the service requested |
| Evidence verification | Service performance; legitimate interest in platform integrity |
| Sharing approved evidence with an employer | Consent (`EMPLOYER_EVIDENCE`) |
| Opportunity notifications | Consent (`OPPORTUNITY_ALERTS`) |
| Improving recommendations from de-identified outcomes | Consent (`OUTCOME_LEARNING`) |
| Aggregate institutional and national reporting | Legitimate interest, on suppressed aggregates only |
| Audit, consent, appeal and rights records | Legal obligation under PDPL |

Consent purposes are separately controlled and independently withdrawable. None
is a condition of using the platform.

---

## 3. Necessity and proportionality

**Is the processing necessary to achieve the purpose?** Readiness scoring
requires evidence of competence; there is no less intrusive dataset that
produces a skills-based assessment. The alternative the platform displaces —
screening on institution prestige and grade average — is *more* discriminatory
while using less data.

**Is it proportionate?** Data minimisation is applied at schema level rather
than at query level. The platform holds no demographic data, no academic
transcript ingest, and no contact data beyond an email address.

**Function creep controls.** Any new special-category field requires a
documented lawful basis and an update to this assessment before the field is
added. Secondary use of inferred signals for advertising or profiling is
prohibited outright by the Responsible AI Policy.

---

## 4. Risk assessment

Likelihood and severity are assessed before mitigation, with residual risk
after the controls described.

### R1 — Automated decision entrenches exclusion at scale
**Inherent: High / High.** A candidate is filtered out by a score they cannot
see, cannot understand, and cannot contest — replicating the ATS opacity the
platform exists to replace, with greater reach.

**Controls.** Explanation is generated in the same computation as the score, so
it cannot drift from the actual reason. Scoring weights are published
(35/20/20/15/10 readiness; 55/25/20 matching). Every consequential action is
written to `AuditEvent` with the ruleset version and reasoning. Four appeal
categories route to a human whose decision overrides the model. Terms of Use
bind employers not to reject on score alone.

**Residual: Low / High.** Severity is irreducible — employment decisions matter.
Likelihood is materially reduced but depends on employer conduct we can bind
contractually and monitor, not prevent.

### R2 — Human oversight degrades into rubber-stamping
**Inherent: High / High.** The most likely quiet failure. Reviewers approve
every recommendation, so the system decides consequentially while appearing
supervised.

**Controls.** Override and disagreement rates are tracked as monitored
indicators; an anomalously *low* override rate triggers investigation rather
than satisfaction. `GovernanceScenario.humanDecision` records `OVERRIDDEN`
explicitly, so disagreement is a first-class recorded outcome. Reviewers are
trained to treat a Reasoning Card as an object of scrutiny.

**Residual: Medium / High.** This is a behavioural risk that technical control
cannot eliminate. It is the assessment's principal ongoing concern.

### R3 — Proxy discrimination
**Inherent: Medium / High.** Protected attributes are not collected, but
institution, region, and career interruption can proxy for them.

**Controls.** No protected attribute is collected. `Job.blindReview` withholds
identifying detail at screening. A low score is presented as an incomplete
evidence set rather than a judgement of capability, and alternative evidence
routes (portfolio, practical assessment, employer attestation) feed the same
taxonomy.

**Residual: Medium / High.** *Structural limitation:* fairness cannot be
directly audited on attributes deliberately never collected. Disparity review
therefore depends on institutions conducting evaluation under their own lawful
basis with separately governed data. This is an accepted trade-off — collecting
demographics to measure fairness would create the exact risk being measured —
and it is disclosed rather than resolved.

### R4 — Re-identification from aggregate reporting
**Inherent: Medium / Medium.** A readiness band distribution across three
students identifies all three.

**Controls.** `MIN_COHORT = 5` in `src/lib/cohort.ts` applies to *every*
reporting group, not only to the cohort as a whole: readiness bands, career
tracks, skill gaps and certification gaps are each withheld below five
students. Bands and tracks partition the cohort, so withholding exactly one of
them would leak it by subtraction; the aggregation layer therefore withholds a
second group whenever that would otherwise happen. Withheld groups are returned
with null statistics and rendered as an explicit "withheld" marker, so the
control is visible rather than appearing as absent data. Suppression is
enforced in the aggregation layer, so every consumer inherits it — including
the assistant, which receives `{withheld: true}` rather than a number.
`scripts/verify-privacy.ts` asserts all of this against live data.

**Residual: Low / Medium.** Combining multiple suppressed reports over time
remains theoretically possible; Terms of Use prohibit attempts.

### R5 — Language-model processing of evidence documents
**Inherent: High / High.** Document contents including the recipient's name are
transmitted to a third-party inference service outside the Kingdom.

**Controls.** Extraction output is advisory only and never verifies evidence; a
human approves or rejects. Data is not used for model training. The feature is
disableable per institution, and the platform functions without it. Disclosed
in Privacy Policy clauses 6, 6a, 6b and 9.

**Residual: Medium / High.** *This is the highest residual risk in the
assessment.* Cross-border inference is not yet remediated. **Required before
production processing of real student records:** bind inference to a compliant
in-Kingdom region, or restrict the feature to institutions that have accepted
the transfer under a documented basis.

### R6 — Assistant discloses individual data across a role boundary
**Inherent: Medium / High.** A university user asks the assistant to identify a
specific student.

**Controls.** Facts are scoped by role in the context builder *before* leaving
our systems, so the boundary does not depend on the model refusing.
`scripts/verify-assistant.ts` asserts automatically that a university context
cannot be constructed containing an individual student record.

**Residual: Low / High.** Enforced structurally and verified by test.

### R7 — Commercial capture of ranking
**Inherent: Medium / High.** Paid placement enters match results or gap
analysis.

**Controls.** Responsible AI Policy clause 10 prohibits it in advance. Any
sponsored content must be labelled, visually distinct, and excluded from the
match computation. Because a Reasoning Card must disclose every input, a
commercial input would either appear in the explanation or make it false —
making covert capture detectable.

**Residual: Low / High.**

### R8 — Unauthorised access to evidence files
**Inherent: Medium / High.**

**Controls.** Private object storage with no public addressing; role-based
access; 25 MB cap; executable and macro-enabled formats rejected; passport
sharing links carry an expiry and are revocable, invalidating immediately.

**Residual: Low / High.**

---

## 5. Data subject rights

| Right | Implementation |
|---|---|
| Be informed | Published Privacy Policy; explanation shown with every score |
| Access | `DataRequest` type `ACCESS` |
| Obtain a copy | `DataRequest` type `DOWNLOAD` |
| Correction | `DataRequest` type `CORRECTION`; extraction errors treated as correction, not support |
| Deletion | `DataRequest` type `DELETION` |
| Withdraw consent | Per-purpose control; withdrawal as easy as granting |
| Object to automated decision | `Appeal` across `READINESS`, `MATCH`, `EVIDENCE`, `DATA` |

Target response: acknowledge within 5 working days, resolve within 30 days.

---

## 6. Outcome and residual risk register

| Ref | Risk | Residual | Owner action |
|---|---|---|---|
| R5 | Cross-border LLM inference | **Medium/High** | **Blocking for production.** Bind inference in-Kingdom or restrict per institution |
| R2 | Automation bias | Medium/High | Ongoing: monitor override rates; investigate low rates |
| R3 | Proxy discrimination | Medium/High | Accepted with disclosure; institutional fairness review |
| R1 | Automated exclusion | Low/High | Ongoing: explanation quality and appeal volume |
| R4, R6, R7, R8 | — | Low | Controls implemented and verified |

**Conclusion.** Processing may proceed at prototype scale. Processing of real
student records at production scale is **conditional on remediating R5** and on
establishing the institutional fairness-review arrangement described in R3.

Additional pre-production requirements: independent WCAG 2.1 AA audit;
completion of Arabic across all portals; written processor agreements with all
sub-processors named in Privacy Policy clause 6.

---

## 7. Review

Reviewed at least annually, and on any change to: scoring weights or inputs,
the categories of data collected, sub-processors, the role-scoping boundary, or
hosting region. The published policies carry the specific figures this
assessment relies on, and both are versioned together.

**Prepared as a prototype-stage assessment. Requires review by a
Saudi-qualified data protection practitioner before production reliance.**
