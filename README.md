# Fursah — AI-Powered Workforce Readiness Ecosystem

> Connecting verified student evidence, employer demand, and university decision-making through transparent workforce-readiness intelligence.

Fursah is a workforce-readiness platform built for the AI Readiness Hackathon. It connects **students, employers, universities, and administrators** in one governed ecosystem that turns verified evidence into readiness insights, explainable candidate-role matching, workforce intelligence, and actionable next steps.

The working prototype is in [`Fursah/`](Fursah/).

## Live Prototype

- **Platform:** https://fursah.org/
- **Presentation:** https://fursah.org/presentation
- **Standards conformance:** https://fursah.org/standards
- **Knowledge base:** https://fursah.org/knowledge-base

## Submission Documents and Presentation

The final hackathon documents and presentation are stored in [`Fursah/public/`](Fursah/public/) so they are versioned with the application and are also served directly by the deployed site.

| Asset | Repository location | Live location |
|---|---|---|
| AI Readiness Hackathon submission | [`Fursah/public/fursah-ai-readiness-hackathon-submission.pdf`](Fursah/public/fursah-ai-readiness-hackathon-submission.pdf) | https://fursah.org/fursah-ai-readiness-hackathon-submission.pdf |
| Judge submission | [`Fursah/public/fursah-ai-readiness-judge-submission.pdf`](Fursah/public/fursah-ai-readiness-judge-submission.pdf) | https://fursah.org/fursah-ai-readiness-judge-submission.pdf |
| Business analysis | [`Fursah/public/fursah-business-analysis.pdf`](Fursah/public/fursah-business-analysis.pdf) | https://fursah.org/fursah-business-analysis.pdf |
| Judge handout | [`Fursah/public/fursah-judge-handout.pdf`](Fursah/public/fursah-judge-handout.pdf) | https://fursah.org/fursah-judge-handout.pdf |
| Presentation | [`Fursah/public/presentation.html`](Fursah/public/presentation.html) | https://fursah.org/presentation |

Additional governance documentation is stored in [`docs/`](docs/), including the project Data Protection Impact Assessment at [`docs/DPIA.md`](docs/DPIA.md).

## The Problem

Education, skills development, hiring, and curriculum planning are often disconnected.

- **Students** may not know which evidence, skills, certifications, projects, or experiences actually move them closer to a target role.
- **Employers** often receive fragmented candidate information and need a clearer, skills-based way to compare applicants.
- **Universities** need aggregated feedback about workforce demand and recurring graduate skill gaps without exposing individual students.
- **Administrators** need auditable controls for verification, appeals, privacy, monitoring, and human oversight.

Fursah addresses this gap with a shared, evidence-based workforce-readiness model.

## What Fursah Does

### Student workspace

Students can:

- Build a structured profile and skills passport.
- Submit certifications, projects, experience, and other evidence.
- View a deterministic Career Readiness Score.
- Identify skill and certification gaps.
- Follow a personalized roadmap.
- Explore opportunities and inspect why they match.
- Track applications and offers.
- Use a grounded assistant to understand their own current data and next actions.

### Employer workspace

Employers can:

- Maintain an organization profile.
- Create opportunities with explicit skills, certification, and experience requirements.
- Review applicants against those requirements.
- Inspect explainable candidate-role match results.
- Use blind-review controls where enabled.
- Record human recruitment decisions and feedback.

A match score is decision support, not a hiring decision.

### University workspace

Universities can view privacy-protected, aggregated information such as:

- Cohort readiness.
- Skill gaps.
- Certification gaps.
- Workforce demand.
- Curriculum alignment opportunities.

Small reporting groups are suppressed to reduce re-identification risk.

### Administration workspace

Administrators can oversee:

- Evidence verification.
- Employer verification.
- Appeals.
- Data requests.
- Governance scenarios.
- Monitoring snapshots.
- Audit records.
- Human overrides and escalation.

## How the Intelligence Layer Works

Fursah deliberately separates **consequential scoring** from **generative AI**.

### Deterministic intelligence

Career readiness, skill-gap analysis, and candidate-role matching are calculated with **deterministic, version-controlled rules**.

A language model does not decide a person's readiness score, match score, evidence approval, or hiring outcome.

This design makes important outputs:

- Reconstructible.
- Inspectable.
- Versioned.
- Easier to challenge and audit.

The authoritative readiness logic is implemented in the application intelligence layer under [`Fursah/src/lib/intelligence/`](Fursah/src/lib/intelligence/).

### Generative AI

Cloudflare Workers AI is used on the explanatory side of the system for two bounded tasks:

1. **Evidence extraction** — interpreting uploaded evidence and proposing structured information such as demonstrated skills and supporting text.
2. **Grounded assistance** — explaining information already available to an authenticated user within that user's permitted scope.

AI extraction does **not** verify evidence. Evidence that requires verification remains advisory until an authorized human reviewer approves it.

The grounded assistant cannot independently alter readiness, matching, verification, or hiring decisions.

## Evidence Trust Model

Fursah separates submission, interpretation, verification, and scoring:

**Submitted evidence → AI-assisted extraction → Human review → Approved evidence → Deterministic scoring**

Pending or rejected evidence does not become trusted simply because it was uploaded or interpreted by AI.

## Responsible AI and Governance

Implemented governance controls include:

- Human review and override.
- Versioned consequential rules.
- Audit records for important actions.
- Evidence verification before trusted scoring.
- Appeals against important outcomes.
- Access, correction, portability, and deletion request workflows.
- Monitoring with a `PAUSED` state for intervention.
- Cohort suppression for small reporting groups.
- Role-scoped assistant context.
- Employer blind-review support.
- No use of gender, nationality, age, or GPA as readiness or matching inputs.

Published policies are available at:

- https://fursah.org/policies/privacy
- https://fursah.org/policies/responsible-ai
- https://fursah.org/policies/terms
- https://fursah.org/policies/accessibility

The governance design is informed by relevant Saudi data, AI, cybersecurity, and privacy frameworks and by international AI-management standards. This is a prototype and does not claim formal regulatory certification or ISO certification.

## Privacy Model

Role boundaries are intentional:

- A **student** receives their own profile, readiness, gaps, roadmap, applications, offers, and relevant opportunity information.
- An **employer** receives information about its own jobs and its own applicant pipeline.
- A **university** receives aggregated and suppression-protected cohort intelligence rather than unrestricted student-level records.
- An **administrator** receives the information required for authorized governance and review functions.

Small cohorts are suppressed where reporting them could create privacy risk.

## Technology Stack

The current application is built with:

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma 7**
- **libSQL / Turso-compatible database access**
- **Cloudflare R2** for private evidence object storage
- **Cloudflare Workers AI** for evidence interpretation and the grounded assistant
- **Vercel** for application deployment

See [`Fursah/package.json`](Fursah/package.json) for the exact dependency versions and available scripts.

## Repository Structure

```text
AI-Powered-Workforce-Readiness-Ecosystem/
├── Fursah/                     # Working Next.js application
│   ├── prisma/                 # Data model and seed data
│   ├── public/                 # Submission PDFs, presentation, public assets
│   ├── scripts/                # Migration, verification, smoke and governance scripts
│   └── src/                    # Application source code
├── docs/
│   └── DPIA.md                 # Data Protection Impact Assessment
├── workers/                    # Cloudflare Worker source/configuration
├── SECURITY.md                 # Security policy
├── LICENSE
└── README.md
```

## Local Development

Fursah currently requires Node.js 24.

```bash
cd Fursah
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

`npm install` runs `prisma generate` automatically through the `postinstall` script.

## Validation Commands

The repository includes automated checks for privacy, assistant scoping, evidence trust, submission integrity, cross-role chains, and smoke behavior.

```bash
cd Fursah
npm run lint
npm run verify
npm run smoke
```

Additional targeted commands include:

```bash
npm run verify:privacy
npm run verify:assistant
npm run verify:evidence
npm run verify:submission
npm run verify:chains
```

Production builds also run the repository's guarded production migration step before the Next.js build.

## Standards and Knowledge Base

Two public pages expose the project's standards and evidence base directly:

- **Standards conformance:** https://fursah.org/standards
- **Knowledge base:** https://fursah.org/knowledge-base

These pages document the project's mappings, source material, governance references, and identified policy gaps.

## Known Prototype Limitations

Fursah is a hackathon prototype, not a production-certified employment system.

Current limitations include:

- Application hosting, object storage, and model inference are not guaranteed to be pinned to a Saudi region.
- Production deployment would require formal data-residency, cross-border-transfer, security, legal, and processor review.
- Direct demographic disparate-impact analysis is limited because protected attributes are intentionally not collected by the platform.
- Some demonstration data is synthetic or seeded and must not be represented as measured real-world performance.
- Accessibility has been designed into the product, but an independent WCAG certification is not claimed.

## Documentation

For detailed system documentation, use the repository Wiki. It covers:

- System Overview
- Student Portal
- Employer Portal
- University Portal
- Administration Portal
- AI and Matching System
- System Architecture
- Responsible AI and Governance
- Privacy and Security
- Workforce Intelligence
- Technology Stack
- Verification Administration
- Abbreviations and Terminology

## Security

Please read [`SECURITY.md`](SECURITY.md) before reporting a vulnerability. Security issues should be disclosed privately rather than through a public issue when doing so could expose users or infrastructure.

## Project Goal

Fursah is designed to make the path from education to employment more transparent and evidence-based:

**Evidence → Readiness → Gap identification → Action → Opportunity → Human decision → Workforce feedback → Better education**

The goal is not simply to recommend jobs. It is to help students understand how to become demonstrably ready for them while giving employers and universities better, governed information for their own decisions.
