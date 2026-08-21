# AI-Powered Workforce Readiness Ecosystem

> Connecting students, employers, and universities through intelligent career pathways.

An **AI-powered workforce readiness ecosystem** designed to bridge the gap between education and employment by connecting **students, employers, and universities** within one intelligent platform.

The ecosystem uses AI to build personalized career pathways, evaluate career readiness, identify skill gaps, match students with employment opportunities, and generate workforce insights that help educational institutions better align with evolving industry needs.

---

## The Problem

A critical disconnect exists between **education, skills development, and employment**.

### Students
Students often struggle to determine which courses, certifications, internships, projects, and extracurricular activities will genuinely prepare them for their desired careers.

### Employers
Employers rely heavily on CVs and interviews, which may provide limited insight into a candidate's actual competencies and workforce readiness.

### Universities
Universities have limited visibility into how their graduates perform in industry and which skills employers increasingly demand.

The result is a gap between **what students learn, what employers need, and how universities prepare future graduates**.

---

## Our Solution

The **AI-Powered Workforce Readiness Ecosystem** creates a continuous connection between:

**Students → Skills Development → Career Readiness → Employers → Workforce Insights → Universities**

At the center of this ecosystem is an AI intelligence layer that continuously analyzes student development, workforce requirements, and employment outcomes.

Instead of providing static career recommendations, the platform creates **adaptive, personalized pathways** that evolve as students gain new skills, qualifications, and experience.

---

## Core Features

### Personalized Career Roadmaps

Students create a comprehensive profile containing their:

- Academic background
- Technical and soft skills
- Certifications
- Projects and portfolio
- Internships and professional experience
- Research activities
- Hackathons and competitions
- Extracurricular activities
- Career goals

AI analyzes this information and generates a **step-by-step personalized career roadmap** toward the student's target role.

---

### Adaptive Learning Intelligence

Career development is rarely a single fixed pathway.

If a student struggles with a certification, assessment, or recommended learning path, the system can identify potential knowledge gaps and recommend an alternative route.

Instead of repeatedly recommending the same action:

**Original Path → Difficulty Identified → Alternative Route → Career Goal**

This allows every student to follow a pathway that adapts to their individual progress.

---

### AI Skills Passport

Each student develops a dynamic **AI Skills Passport** representing their verified competencies and achievements.

The passport can include:

- Degrees and academic achievements
- Technical skills
- Soft skills
- Professional certifications
- Projects
- Internships
- Research
- Workshops
- Competitions and hackathons
- Volunteer experience

The Skills Passport provides employers with a richer representation of a candidate's capabilities beyond a traditional CV.

---

### Career Readiness Score

The platform generates a dynamic **Career Readiness Score (0–100)** based on factors such as:

- Academic achievements
- Technical competencies
- Professional certifications
- Practical experience
- Portfolio development
- Industry engagement

As students develop new competencies, their readiness score evolves.

The AI can then recommend the **highest-impact next actions** that may improve their career readiness.

---

### Intelligent Opportunity Matching

Students can discover and track:

- Job opportunities
- Internships
- Graduate programs
- Companies
- Professional development opportunities

The AI compares each opportunity's requirements against the student's Skills Passport and calculates a personalized compatibility score.

Rather than simply identifying that a student is not qualified, the platform explains:

- Which requirements are already satisfied
- Which competencies are missing
- Which certifications may be required
- Which experience gaps exist
- What the student can do next to improve eligibility

---

### Employer Intelligence

Employers can define the exact competencies required for each opportunity, including:

- Technical skills
- Professional certifications
- Experience
- Tools and technologies
- Soft skills

The AI evaluates candidate profiles against these requirements and produces **explainable candidate-job match scores**.

Employers can understand both:

**Why a candidate is a strong match**

and

**Where competency gaps remain**

> Hiring decisions always remain under human oversight.

---

### Workforce Feedback Loop

The ecosystem does not stop once a student is hired.

Employers can provide anonymized, structured workforce feedback related to areas such as:

- Technical competency
- Teamwork
- Problem solving
- Adaptability

Aggregated workforce outcomes can help improve future career recommendations and reveal which skills, certifications, and learning pathways are associated with stronger employment outcomes.

This creates a continuous feedback cycle:

**Education → Skills → Employment → Workforce Feedback → Better Education**

---

### University Workforce Intelligence

Universities can access aggregated workforce insights to better understand:

- Emerging industry skills
- Workforce demand
- Graduate employment outcomes
- Common graduate skill gaps
- Valuable certifications and learning pathways
- Areas for curriculum improvement

This allows academic programs to become increasingly responsive to real workforce requirements.

---

## How the AI actually works

Fursah has two components, and the boundary between them is the central design
decision in the platform.

### Deterministic intelligence — everything that produces a number

The Career Readiness Score, skill-gap analysis, and candidate–role matching are
computed by a **rule-based engine with published weights** ([`src/lib/ai.ts`](Fursah/src/lib/ai.ts)).
No machine-learning model trained on historical hiring data is involved in any
score that affects a person.

| Career Readiness Score | Weight | | Candidate–role match | Weight |
|---|---|---|---|---|
| Technical skills vs. track | 35% | | Required skills | 55% |
| Certifications (verified only) | 20% | | Required certifications | 25% |
| Relevant experience | 20% | | Experience vs. minimum | 20% |
| Soft skills vs. track | 15% | | *within skills: essential* | *80%* |
| Projects | 10% | | *within skills: preferred* | *20%* |

This is deliberate. A model trained on past hiring outcomes learns past hiring
preference, including its inequities. A weighted rule engine cannot silently
acquire a bias from history because it has no history to learn from, and every
output can be reconstructed and challenged. The trade-off — it cannot discover
patterns nobody encoded — is one we accept for a system that affects access to
employment.

Scores are banded as Career Ready (≥80), Developing (55–79), and Early Stage
(<55). A band describes evidence on file, not a person's ability.

### Generative AI — reading documents and explaining results

A general-purpose language model (Llama 3.1 8B via Cloudflare Workers AI,
reached through our own Worker — see [`src/lib/assistant/llm.ts`](Fursah/src/lib/assistant/llm.ts))
does exactly two things:

1. **Evidence extraction** ([`src/lib/evidence-ai.ts`](Fursah/src/lib/evidence-ai.ts)) — reads an
   uploaded certificate, project, or experience document and proposes the
   skills it evidences, each with a confidence value and the supporting text.
   **Extraction never verifies evidence.** A human reviewer approves or rejects
   before an extracted skill becomes trusted.
2. **The role-scoped assistant** — answers questions about results already
   produced by the deterministic layer. It is grounded on those facts and
   cannot compute or alter a score, a ranking, or a verification decision.

The model sits on the explanatory side of the boundary. Language models are
well suited to reading a document and explaining a result, and poorly suited to
being the reason a person did or did not get an opportunity.

---

## Governance, in code rather than in prose

Each of these is an implemented mechanism, not an aspiration:

| Commitment | Where it lives |
|---|---|
| No protected attributes collected — no gender, nationality, age, or GPA field exists | [`prisma/schema.prisma`](Fursah/prisma/schema.prisma) |
| Cohort aggregates suppressed below 5 students in **every** reporting group — band, career track, skill gap, certification gap — not just the cohort total | `MIN_COHORT` in [`src/lib/cohort.ts`](Fursah/src/lib/cohort.ts) |
| Secondary suppression: withholding one group of a partition would leak it by subtraction, so a second is withheld | `suppressPartition` in [`src/lib/cohort.ts`](Fursah/src/lib/cohort.ts) |
| Suppression is *shown*, not silent — a withheld figure renders as ⊘ with its reason | [`src/components/SuppressedFigure.tsx`](Fursah/src/components/SuppressedFigure.tsx) |
| Every consequential action logged with its ruleset version and reasoning | `AuditEvent` model |
| Purpose-specific consent, versioned, independently withdrawable | `ConsentRecord` model |
| Four PDPL request types: access, portability, correction, deletion | `DataRequest` model |
| Appeals against readiness, match, evidence, and data decisions | `Appeal` model |
| Drift monitoring with a `PAUSED` state, so rollback is an available action | `MonitoringSnapshot` model |
| Governance decisions recorded including where a human **overrode** the proposal | `GovernanceScenario.humanDecision` |
| Assistant role-scoping verified automatically for all three roles — a university context can never contain an individual student record, an employer context never a non-applicant, a student context never a peer | [`scripts/verify-assistant.ts`](Fursah/scripts/verify-assistant.ts) |
| Cohort suppression verified against live data on every run | [`scripts/verify-privacy.ts`](Fursah/scripts/verify-privacy.ts) |
| Evidence stays advisory until a named human approves it — asserted, not assumed | [`scripts/verify-evidence.ts`](Fursah/scripts/verify-evidence.ts) |
| Session cookies are HMAC-signed, so a user id alone cannot open a session | `signSession` in [`src/lib/session.ts`](Fursah/src/lib/session.ts) |
| The password-free demo shortcut opens prepared demo accounts only, never a real sign-up | [`src/lib/demoAccounts.ts`](Fursah/src/lib/demoAccounts.ts) |
| Assistant rate limits are per authenticated user, so one visitor cannot switch it off for everyone | [`src/app/api/assistant/route.ts`](Fursah/src/app/api/assistant/route.ts) |
| Employer blind review, withholding identifying detail at screening | `Job.blindReview` |

Published policies: [Privacy](https://fursah.org/policies/privacy) ·
[Responsible AI](https://fursah.org/policies/responsible-ai) ·
[Terms](https://fursah.org/policies/terms) ·
[Accessibility](https://fursah.org/policies/accessibility)

### Known limitations

Stated here rather than discovered later:

- **Prototype hosting is not in-Kingdom.** Application hosting (Vercel),
  storage (Cloudflare R2), and model inference (Cloudflare Workers AI) are not
  currently pinned to a Saudi region. Production deployment requires binding
  these to a compliant region and documenting any residual transfer.
- **No independent WCAG 2.1 AA audit** has been carried out; the conformance
  claim is a target based on internal review.
- **Arabic coverage is complete on the public pages and partial inside the
  portals.** Untranslated strings fall back to English rather than failing, so
  a portal page in Arabic can still show English fragments.
- **The assistant's behavioural safety probes only run where the assistant is
  configured.** `scripts/verify-assistant.ts` asserts the grounding contract
  and the data boundaries everywhere, but the adversarial prompts — refusing
  another student's data, refusing a hiring decision, resisting prompt
  injection — report SKIP without `ASSISTANT_AI_URL`. Model behaviour is
  unverified until they run.
- **Fairness monitoring cannot use protected attributes**, because none are
  collected. Disparity review therefore depends on institutions conducting
  evaluation under their own lawful basis with separately governed data.
- Some demonstration data is seeded rather than measured. See
  `npm run seed:governance`.

---

## Standards conformance and the knowledge base

Two published pages carry the assessment material directly, so it can be read
without running the prototype:

- **[Standards conformance](https://fursah.org/standards)** — the platform
  mapped onto **ITU-T Y.3172 clause 8.1** node by node (SRC, C, PP, M, P, D,
  SINK), each with the source file implementing it; the two components Fursah
  runs that clause 8.1 does not define, attributed to Y.3181 and Y.3176; a
  self-assessment against the **13 dimensions of the ITU AI Ready Report 2.0**;
  and the **policy gaps** this project identified, structured on the report's
  own chapter 4 gap taxonomy.
- **[Knowledge base](https://fursah.org/knowledge-base)** — every authentic
  public document the platform depends on, linked to the original publication
  and to the file in this repository that depends on it: the ITU
  Recommendations and reports, the PDPL, SDAIA AI Ethics Principles, NDMO and
  NCA controls, DGA accessibility standards, Vision 2030, GASTAT, the Council
  of Universities Affairs, UNESCO, and ISO/IEC 42001 and 23894.

The seven clause 8.1 node names live in one place
([`src/lib/standards.ts`](Fursah/src/lib/standards.ts)) and are rendered by both
the public pipeline figure and the admin governance page, so the two surfaces
cannot describe the pipeline differently.

Six policy gaps are stated. The one marked blocking is cross-border inference
(DPIA risk R5). The most interesting is the fairness paradox: because Fursah
deliberately collects no protected attribute, it cannot disaggregate outcomes
to test for disparate impact — data minimisation and demonstrable
non-discrimination pull against each other, and no instrument we found resolves
which takes precedence for an employment-adjacent system.

---

## Ecosystem Architecture

```text
           ┌──────────────────────┐
           │       STUDENTS       │
           └──────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │    AI INTELLIGENCE   │
           │                      │
           │ • Career Pathways    │
           │ • Skills Analysis    │
           │ • Readiness Scoring  │
           │ • Opportunity Match  │
           └──────────┬───────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│    EMPLOYERS     │    │   UNIVERSITIES   │
│                  │    │                  │
│ Talent Matching  │    │ Workforce        │
│ Skill Demand     │    │ Intelligence     │
└────────┬─────────┘    └─────────▲────────┘
         │                        │
         └──── Workforce Data ────┘
```

The result is a **continuous AI-driven feedback loop between education and employment**.

---

## Stakeholder Benefits

| Students | Employers | Universities |
|---|---|---|
| Personalized career guidance | Better candidate-job matching | Industry demand insights |
| Adaptive learning pathways | Verified competencies | Graduate employment analytics |
| Career readiness tracking | Faster candidate discovery | Skill-gap identification |
| Skills Passport | Explainable match scores | Data-driven curriculum insights |
| Opportunity recommendations | Reduced recruitment mismatch | Better industry alignment |

---

## Alignment with Saudi Vision 2030

The ecosystem supports the broader goals of **Saudi Vision 2030** by contributing to:

- Human capital development
- Workforce readiness
- Digital transformation
- Skills-based employment
- Education-industry alignment
- Development of future-ready Saudi talent

By connecting education more closely with real workforce requirements, the platform aims to help students develop the competencies needed for an increasingly technology-driven economy.

---

## Long-Term Vision

Our long-term vision is to create a **national AI-powered workforce readiness ecosystem** where students, universities, and employers operate within one connected intelligent environment.

The platform transforms education and employment from two separate stages into a continuous cycle:

**Learn → Develop → Measure → Match → Employ → Evaluate → Improve**

Ultimately, the goal is not simply to help students **find jobs**, but to help them understand **how to become genuinely ready for them**.

---

## Running the Prototype

**Fursah** is the working prototype of this ecosystem, located in [`Fursah/`](Fursah/). It is a Next.js 16 app (React 19, TypeScript, Tailwind CSS 4) with Prisma over libSQL.

### Quick start

```bash
cd fursa
npm install          # runs `prisma generate` automatically
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Explore Prototype** to sign in as one of the seeded student, employer, university, or admin profiles.

The bundled SQLite file (`prisma/dev.db`) is used by default, so the demo runs offline with no credentials. Hosted deployments point `DATABASE_URL` at Turso and supply `TURSO_AUTH_TOKEN`.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Apply production migrations, then build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run create-admin` | Create an `ADMIN` account from `ADMIN_*` env vars |

### Environment

Create `Fursah/.env.local` with the variables your setup needs. Readiness scoring, skill-gap analysis, and opportunity matching run on deterministic local logic, so no model API key is required to run the prototype.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma/libSQL connection string (defaults to the bundled `file:./prisma/dev.db`) |
| `TURSO_AUTH_TOKEN` | Auth token for hosted Turso databases |
| `NEXT_PUBLIC_FIREBASE_*` | Public Firebase web configuration for client authentication |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK service-account credentials for session cookies |
| `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare R2 storage for evidence documents and avatars |
| `EVIDENCE_AI_URL`, `EVIDENCE_AI_SECRET` | Endpoint and shared secret for the evidence-analysis service |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed credentials used by `npm run create-admin` |

### Authentication and evidence review

Accounts use Firebase Authentication with server-side session cookies; enable Email/Password sign-in in the Firebase console before using real accounts.

Certificate claims require a JPG, PNG, or WebP evidence image (maximum 5 MB). Uploads are stored privately in Cloudflare R2, enter the queue as `PENDING`, and only affect readiness scoring and matching once an `ADMIN` approves them.

### Architecture notes

Data access is server-only and isolated in `src/lib` and server actions, so the persistence layer can be swapped without touching the UI.

---

## Project Status

This project is currently being developed as part of the **AI Readiness Hackathon – Kingdom of Saudi Arabia**.

The current implementation focuses on demonstrating the core AI-powered workforce readiness experience and the interaction between students, employers, and educational institutions.

---

## Team

Developed by our team for the **AI Readiness Hackathon – Kingdom of Saudi Arabia**.

---

## License

This project is developed for hackathon and educational purposes.

All rights reserved unless otherwise specified.
