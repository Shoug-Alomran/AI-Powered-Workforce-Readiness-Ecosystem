export type PortalRole = "STUDENT" | "EMPLOYER" | "UNIVERSITY" | "ADMIN";

export type Step = {
  title: string;
  body: string;
  /** CSS selector for the element to spotlight. Comma lists are allowed; the first match wins. */
  selector?: string;
  /** Fallback anchor: the card/section whose heading starts with this text. */
  heading?: string;
  /** Turns the step into a "do it" step: the tour advances when the user performs the action. */
  interact?: { event: "click" | "change" | "submit" | "input"; hint: string };
};

export type Tour = { key: string; label: string; steps: Step[] };

/** Shown once per role, on the first portal page the user lands on. */
export const chromeSteps: Record<PortalRole, Step[]> = {
  STUDENT: [
    { title: "Your student workspace", body: "This navigation moves you between readiness, careers, jobs, applications, your roadmap, and your verified Skills Passport.", selector: ".student-nav", interact: { event: "click", hint: "Pick any destination to jump there. The tour follows you." } },
    { title: "Your account", body: "Open your account to update your photo, email, password, and personal details.", selector: ".student-profile-link" },
  ],
  EMPLOYER: [
    { title: "Your hiring workspace", body: "Dashboard keeps hiring activity together. Post a Job opens the complete opportunity form.", selector: ".erd-nav", interact: { event: "click", hint: "Choose a destination. The tour re-anchors to whatever page you open." } },
    { title: "Search your roles", body: "Search by role name, career track, or required skill without leaving the employer portal.", selector: ".erd-search", interact: { event: "input", hint: "Type a role name to filter the dashboard." } },
    { title: "Your account", body: "Open your profile to update your organization-verified email, password, and profile image.", selector: ".erd-user-profile" },
  ],
  UNIVERSITY: [
    { title: "Your university workspace", body: "Move between institutional outcomes, curriculum, workforce demand, and the human-reviewed action plan.", selector: ".uni-only-main nav", interact: { event: "click", hint: "Open any section. This tour continues on the page you land on." } },
    { title: "Page-specific actions", body: "The actions shown here change with the page, so exports and creation tools stay relevant to what you are looking at.", selector: ".uni-only-actions" },
    { title: "Your institution account", body: "Open the profile to manage the verified university identity and sign-in details.", selector: ".uni-only-user" },
  ],
  ADMIN: [
    { title: "Governance workspace", body: "These primary destinations cover trust review, evidence audits, platform health, and security.", selector: ".admin-primary-nav", interact: { event: "click", hint: "Open a queue. The tour picks up the page you choose." } },
    { title: "On this page", body: "This contextual menu changes by page and jumps directly to the review section you need.", selector: ".admin-page-menu" },
    { title: "Administrator account", body: "Your account and sign-out controls remain available from every admin page.", selector: ".admin-header-account" },
  ],
};

/**
 * Ordered longest-prefix-first route table. The first entry whose prefix matches
 * the current pathname supplies the page tour.
 */
const routeTours: Array<{ prefix: string; match?: RegExp; tour: Tour }> = [
  // ---------------------------------------------------------------- STUDENT
  {
    prefix: "/student/dashboard",
    tour: {
      key: "student-dashboard",
      label: "Readiness dashboard",
      steps: [
        { title: "Readiness at a glance", body: "Your hero summarises the career track you are aiming at and where you stand today.", selector: ".student-dashboard-hero, .student-design-hero" },
        { title: "Your readiness score", body: "The ring is calculated from verified skills, certifications, experience, and project evidence, never from personal traits.", selector: ".student-readiness-panel, .student-readiness-ring" },
        { title: "Category breakdown", body: "Every score is explainable. This breakdown shows which category is holding the number back.", selector: ".student-breakdown, .student-summary-metrics" },
        { title: "What the AI suggests", body: "Recommendations are advisory. They point at the next useful action; you decide whether to take it.", selector: ".student-ai-callout" },
        { title: "Employer feedback", body: "Decisions arrive with the employer's reasoning attached, so a rejection is never silent.", selector: ".student-feedback-section, .student-feedback-list" },
        { title: "Take the next step", body: "These actions move you straight into the workflow the recommendation refers to.", selector: ".student-hero-actions", interact: { event: "click", hint: "Try one. The walkthrough continues wherever it takes you." } },
      ],
    },
  },
  {
    prefix: "/student/interests",
    tour: {
      key: "student-interests",
      label: "Career direction",
      steps: [
        { title: "Choose a direction", body: "Your target career decides which skills are weighted in your readiness score.", selector: ".student-interests-hero, .student-design-hero" },
        { title: "Major first, then career", body: "Start with a broad major, then choose from only the careers related to it. You can change this later.", selector: ".student-career-setup, .student-career-selector-form, #choose-career", interact: { event: "change", hint: "Pick a major to see the related careers appear." } },
        { title: "Secondary interests", body: "Additional interests broaden your job matches without changing the track you are scored against.", selector: ".student-career-interests" },
        { title: "What this changes", body: "These stats update as soon as the target track changes, so you can compare directions before committing.", selector: ".student-interest-stats, .student-score-card" },
        { title: "AI guidance", body: "The assistant explains why a track fits your current evidence; it does not choose for you.", selector: ".student-ai-callout, .student-ai-section" },
        { title: "Apply your choice", body: "Saving updates your roadmap and job matches immediately.", selector: ".student-track-actions", interact: { event: "click", hint: "Save when you are happy with the selection." } },
      ],
    },
  },
  {
    prefix: "/student/jobs",
    tour: {
      key: "student-jobs",
      label: "Job discovery",
      steps: [
        { title: "Opportunities matched to you", body: "Every open role is ranked against your verified passport, not your browsing history.", selector: ".student-job-discovery" },
        { title: "Anatomy of a match", body: "Each card starts with the employer, the role, and the score it earned.", selector: ".student-job-card-header, .student-job-card" },
        { title: "Why this score", body: "The grid separates skills you already evidence from the ones the employer still requires.", selector: ".student-job-match-grid" },
        { title: "The explanation", body: "A plain-language reason accompanies every match so you can judge whether the ranking is fair.", selector: ".student-job-explanation" },
        { title: "Attach your documents", body: "CVs and supporting files stay private to you, the employer, and authorized reviewers.", selector: ".student-job-apply-form" },
        { title: "Save or apply", body: "Save and Apply sit together in the action area, and the button reflects the state of your application.", selector: ".student-job-card-footer, .student-job-save-form", interact: { event: "click", hint: "Save a role to come back to it later." } },
      ],
    },
  },
  {
    prefix: "/student/applications",
    tour: {
      key: "student-applications",
      label: "Your applications",
      steps: [
        { title: "Explainable outcomes", body: "Every application you have submitted is listed here with its current status.", selector: ".page-shell .stack, .page-shell .card" },
        { title: "Status and score", body: "The match score is frozen at the moment you applied, so later profile changes do not rewrite history.", selector: ".page-shell .card .data-row" },
        { title: "Employer reasoning", body: "When a status changes, the employer's written reason is attached to the application.", selector: ".page-shell .notice" },
      ],
    },
  },
  {
    prefix: "/student/roadmap",
    tour: {
      key: "student-roadmap",
      label: "Adaptive roadmap",
      steps: [
        { title: "Your adaptive roadmap", body: "The plan is generated from the gap between your evidence and your target career.", selector: ".student-roadmap-hero, .student-design-hero" },
        { title: "Milestones", body: "Update milestones as you progress. Dates and projected readiness adjust the plan over time.", selector: ".student-milestones", interact: { event: "click", hint: "Mark a milestone to see the projection move." } },
        { title: "Projected readiness", body: "The chart projects where your score lands if you complete the plan on schedule.", selector: ".roadmap-chart, .roadmap-chart-legend" },
        { title: "Roadmap analytics", body: "Pace, remaining effort, and the categories your plan is weighted toward.", selector: ".student-roadmap-analytics" },
        { title: "Career context", body: "The target track stays visible so you can tell whether the plan still matches your ambition.", selector: ".student-career-roadmap" },
      ],
    },
  },
  {
    prefix: "/student/profile",
    tour: {
      key: "student-passport",
      label: "Skills Passport",
      steps: [
        { title: "Start here", body: "You land on your Skills Passport first because everything else (readiness, roadmap, job matches) is computed from what you enter here.", selector: ".student-passport-setup" },
        { title: "Your Skills Passport", body: "This is the evidence-backed record employers see: identity, target track, and verification state.", selector: ".student-passport-hero, .student-passport-identity" },
        { title: "Verification status", body: "Nothing is presented as verified until a human administrator has approved the evidence behind it.", selector: ".student-passport-status" },
        { title: "Passport metrics", body: "Counts of skills, certifications, experience, and projects that currently carry evidence.", selector: ".student-passport-metrics" },
        { title: "Add to your passport", body: "Each section takes its own submission. Adding an entry starts an automated check, then human review.", selector: ".passport-section, .passport-form", interact: { event: "submit", hint: "Submit an entry to send it into the review queue." } },
        { title: "Photo and sharing", body: "Update your picture and open the controlled sharing workflow from here.", selector: ".student-passport-actions, .student-passport-avatar" },
      ],
    },
  },
  {
    prefix: "/student/account",
    tour: {
      key: "student-account",
      label: "Account settings",
      steps: [
        { title: "Your identity", body: "Name, email, and the details shown to employers alongside your passport.", selector: ".account-identity" },
        { title: "Profile photo", body: "Upload or replace the image used across the portal.", selector: ".account-avatar--large", interact: { event: "click", hint: "Open the picker to change your photo." } },
        { title: "Security", body: "Change your password here. Sessions stay signed in until you log out.", selector: ".account-security" },
        { title: "Passport shortcut", body: "Jump straight into the Skills Passport without going back through the navigation.", selector: ".student-account-passport" },
      ],
    },
  },
  {
    prefix: "/student/evidence",
    tour: {
      key: "student-evidence",
      label: "Evidence submission",
      steps: [
        { title: "Evidence-based passport", body: "Projects and experience only count toward readiness once evidence is attached and reviewed.", selector: ".page-title" },
        { title: "Add a project", body: "Describe the project and attach a private file or a public evidence link.", heading: "Add a project", interact: { event: "submit", hint: "Submit a project to start the review." } },
        { title: "Add experience", body: "Internships, research, volunteering, competitions, and workshops all take the same evidence route.", heading: "Add experience" },
        { title: "Review status", body: "Automated checks screen the submission first; an administrator makes the final verification decision.", selector: ".page-shell .data-row .pill, .page-shell .data-row" },
      ],
    },
  },
  {
    prefix: "/student/passport-sharing",
    tour: {
      key: "student-sharing",
      label: "Controlled sharing",
      steps: [
        { title: "Controlled sharing", body: "Share your passport with a time-limited public link instead of exposing your profile.", selector: ".page-title" },
        { title: "Create a link", body: "Label the recipient or purpose and choose how long the link stays valid.", heading: "Create a link", interact: { event: "submit", hint: "Create a link to see it appear on the right." } },
        { title: "Revoke at any time", body: "Revoking cuts access immediately without changing anything in your profile.", heading: "Active and previous links" },
      ],
    },
  },
  {
    prefix: "/student/privacy",
    tour: {
      key: "student-privacy",
      label: "Privacy and appeals",
      steps: [
        { title: "Control and correction", body: "Consent, appeals, and notifications about automated decisions live on this page.", selector: ".page-title" },
        { title: "Purpose-specific consent", body: "Each purpose is granted or withdrawn separately; there is no single all-or-nothing switch.", heading: "Purpose-specific consent", interact: { event: "click", hint: "Toggle a purpose to see consent applied immediately." } },
        { title: "Request human review", body: "Challenge a readiness score, a match, an evidence decision, or a data use, and a person reviews it.", heading: "Request human review" },
        { title: "Notifications", body: "Outcomes of your appeals and consent changes are recorded here.", heading: "Notifications" },
      ],
    },
  },
  {
    prefix: "/student/data-rights",
    tour: {
      key: "student-data-rights",
      label: "Data requests",
      steps: [
        { title: "Your information, your rights", body: "Request a copy, a correction, an access summary, or deletion of your account data.", selector: ".page-title" },
        { title: "New request", body: "Choose the request type and describe what is involved so a reviewer can act on it.", heading: "New request", interact: { event: "submit", hint: "Submit a request to see it tracked." } },
        { title: "Request history", body: "Deletion requests are reviewed so records that must be retained lawfully are protected.", heading: "Request history" },
      ],
    },
  },

  // --------------------------------------------------------------- EMPLOYER
  {
    prefix: "/employer/dashboard",
    tour: {
      key: "employer-dashboard",
      label: "Hiring dashboard",
      steps: [
        { title: "Live hiring activity", body: "Open roles, candidates, rankings, and bottlenecks are calculated from your actual account data.", selector: ".erd-metrics" },
        { title: "Your open positions", body: "Each row opens the role, its requirements, and everyone who applied to it.", selector: ".erd-positions", interact: { event: "click", hint: "Open a role to see its candidate list." } },
        { title: "Candidate ranking", body: "Ranking is driven by evidence in each applicant's passport, and every score can be opened up.", selector: ".erd-ranking" },
        { title: "Hiring intelligence", body: "Where your pipeline is losing candidates, and which skills your postings keep asking for.", selector: ".erd-intel" },
        { title: "Recent activity", body: "New applications and status changes across all of your roles.", selector: ".erd-activity" },
      ],
    },
  },
  {
    prefix: "/employer/jobs/new",
    tour: {
      key: "employer-post-job",
      label: "Post a job",
      steps: [
        { title: "Create a real opportunity", body: "This form publishes a live opportunity that students can apply to; nothing here is a demo control.", selector: ".pjob-top" },
        { title: "Role basics", body: "Title, description, and location set what students see first in job discovery.", selector: ".pjob-section" },
        { title: "Work arrangement", body: "Arrangement and employment type feed the filters students search with.", selector: ".pjob-arrangement, .pjob-switch-grid" },
        { title: "Required skills", body: "Skills you add here become the weighted criteria behind every match score on this role.", selector: ".pjob-token-input", interact: { event: "input", hint: "Type a skill and add it to see the weighting build up." } },
        { title: "Human oversight", body: "Matching assists your shortlist; it never rejects or hires on your behalf.", selector: ".pjob-oversight" },
        { title: "Live preview", body: "The side panel shows the posting as an applicant will read it.", selector: ".pjob-aside, .pjob-recent" },
        { title: "Publish or discard", body: "Publish when the required information is ready; discarding leaves nothing behind.", selector: ".pjob-footer" },
      ],
    },
  },
  {
    prefix: "/employer/jobs/",
    match: /^\/employer\/jobs\/[^/]+\/candidates\//,
    tour: {
      key: "employer-candidate",
      label: "Candidate review",
      steps: [
        { title: "Human hiring decision", body: "Everything on this page supports your decision; the platform does not make it for you.", selector: ".employer-candidate-content .data-row, .page-title" },
        { title: "Application snapshot", body: "Status, application date, and the applicant's own summary.", selector: ".employer-candidate-content .grid-3" },
        { title: "Explainable match", body: "Matched skills and missing requirements are listed before any score is acted on.", heading: "Explainable match" },
        { title: "Private documents", body: "Applicant files are private to the applicant, your organization, and authorized reviewers.", heading: "Private application documents" },
        { title: "The Skills Passport", body: "Skills, certifications, experience, and projects, each with its verification status.", heading: "AI Skills Passport" },
        { title: "Your decision", body: "Available decisions change with the candidate's current status, so an action cannot be repeated incorrectly.", heading: "Decision" },
        { title: "Structured feedback", body: "Recording your reasoning is what turns a status change into an explainable outcome for the student.", selector: ".employer-feedback-form, .employer-feedback-scores", interact: { event: "submit", hint: "Send feedback so the applicant sees why." } },
        { title: "Feedback history", body: "Previous feedback on this application stays attached to it.", selector: ".employer-feedback-history, .employer-feedback-checkpoint" },
      ],
    },
  },
  {
    prefix: "/employer/jobs/",
    tour: {
      key: "employer-role",
      label: "Manage a role",
      steps: [
        { title: "Manage this role", body: "Requirements, candidates, and the open/closed state of one opportunity.", selector: ".page-title" },
        { title: "Open or close the role", body: "Closing or reopening immediately changes whether students can apply.", selector: ".employer-role-status, .employer-detail-content .actions" },
        { title: "Role metrics", body: "Candidate count, average match, and hires so far on this posting.", selector: ".employer-detail-content .grid-3" },
        { title: "Requirements", body: "The weighted skills and certifications this role is scored against.", selector: "#requirements" },
        { title: "Candidate ranking", body: "The list stays put so you can compare everyone before opening an individual profile.", selector: "#candidates", interact: { event: "click", hint: "Open a candidate to review their evidence." } },
      ],
    },
  },
  {
    prefix: "/employer/profile",
    tour: {
      key: "employer-profile",
      label: "Employer account",
      steps: [
        { title: "Organization identity", body: "The company details attached to every role you publish.", selector: ".account-identity" },
        { title: "Verification", body: "Verified organizations are labelled to students; unverified accounts are not hidden, only marked.", selector: ".account-verification" },
        { title: "Profile image", body: "Your image appears alongside your postings and in candidate correspondence.", selector: ".account-avatar--large" },
        { title: "Security", body: "Update your organization-verified email and password here.", selector: ".account-security" },
      ],
    },
  },

  // ------------------------------------------------------------- UNIVERSITY
  {
    prefix: "/university/dashboard",
    tour: {
      key: "university-dashboard",
      label: "Institution overview",
      steps: [
        { title: "Institution overview", body: "Use the page contents bar to jump to demand, alignment, outcomes, or pathways without being overwhelmed.", selector: ".ud-toc", interact: { event: "click", hint: "Jump to any section from here." } },
        { title: "Headline metrics", body: "Institutional readiness, placement, and coverage, all computed from real records.", selector: ".ud-metrics" },
        { title: "Workforce demand", body: "What employers on the platform are actually asking for right now.", selector: ".ud-demand" },
        { title: "Curriculum alignment", body: "Where your offerings meet current employer demand, and where they do not. A count over open roles today, not a change over time.", selector: ".ud-alignment, .ud-alignment-stats" },
        { title: "Graduate outcomes", body: "Readiness and application activity aggregated across your students. Employment start dates are not recorded, so placement itself is not reported.", selector: ".ud-outcomes" },
        { title: "Career pathways", body: "Which tracks your students are targeting and how prepared they are for each.", selector: ".ud-pathways" },
        { title: "Curriculum advisor", body: "Recommendations ranked by current demand and cohort evidence. Advisory inputs to a human decision, never automated policy, and never a projection.", selector: ".ud-advisor" },
      ],
    },
  },
  {
    prefix: "/university/curriculum",
    tour: {
      key: "university-curriculum",
      label: "Curriculum workspace",
      steps: [
        { title: "Executive summary", body: "Start with the institution-level read on how the curriculum is tracking against demand.", selector: ".cc-executive, .cc-overview" },
        { title: "Alignment metrics", body: "Coverage, gaps, and the pulse of change since the last review.", selector: ".cc-metrics, .cc-pulse" },
        { title: "Search and filter", body: "Narrow to a department, a level, or a specific skill before you act.", selector: ".cc-search, .cc-filter", interact: { event: "input", hint: "Search for a course to filter the workspace." } },
        { title: "Switch views", body: "The tabs move between courses, required skills, and certification mapping.", selector: ".cc-tabs", interact: { event: "click", hint: "Try another tab. The tour stays with you." } },
        { title: "Courses", body: "Each course shows the skills it delivers and how those map to live demand.", selector: ".cc-course-grid, .cc-course" },
        { title: "AI analysis", body: "The analysis explains its reasoning so a curriculum committee can accept or reject it.", selector: ".cc-analysis" },
        { title: "Recommendations", body: "Recommended additions move into the offerings or action workflow rather than sitting as text.", selector: ".cc-recommend, .cc-required" },
        { title: "Certification mapping", body: "How industry certifications line up against what you currently teach.", selector: ".cc-cert-section, .cc-mapping" },
      ],
    },
  },
  {
    prefix: "/university/job-demand",
    tour: {
      key: "university-demand",
      label: "Workforce demand",
      steps: [
        { title: "Demand at a glance", body: "Volume, growth, and concentration of employer demand relevant to your programs.", selector: ".wdi-metrics, .wdi-summary" },
        { title: "Filter the signal", body: "Narrow by sector, track, or period before drawing a conclusion.", selector: ".wdi-filters", interact: { event: "change", hint: "Change a filter to re-cut the data." } },
        { title: "Skill intelligence", body: "Each update, review, or add link opens the relevant workflow rather than acting as a decorative control.", selector: ".wdi-skills, .skill-stats" },
        { title: "Gaps", body: "Skills employers request that your curriculum does not currently deliver.", selector: ".wdi-gaps" },
        { title: "Employers and trends", body: "Who is hiring, and how their requirements have moved over time.", selector: ".wdi-employers, .wdi-trends" },
        { title: "Turn demand into action", body: "Partnership and action links carry the context with them into the initiative workflow.", selector: ".wdi-action, .wdi-partners" },
      ],
    },
  },
  {
    prefix: "/university/actions/new",
    tour: {
      key: "university-action-new",
      label: "New initiative",
      steps: [
        { title: "Create an initiative", body: "Initiatives are the accountable record of what the institution decided to do about a gap.", selector: ".cap-create-heading, .cap-create-page" },
        { title: "Initiative details", body: "Scope, owner, and timeline determine how completion is later verified.", selector: ".cap-create-fields" },
        { title: "AI assistance", body: "Suggestions draft the initiative; the submitted content remains yours.", selector: ".cap-create-ai" },
        { title: "Context panel", body: "The demand and alignment evidence that justified this initiative stays attached.", selector: ".cap-create-aside" },
        { title: "Submit", body: "Submitting places the initiative in the tracker, where evidence of completion is required later.", selector: ".cap-create-form button[type=submit], .cap-create-form" },
      ],
    },
  },
  {
    prefix: "/university/actions",
    tour: {
      key: "university-actions",
      label: "Action plan",
      steps: [
        { title: "Human-reviewed initiatives", body: "Every initiative on this page ends in a human verification decision.", selector: ".cap-summary, .cap-page" },
        { title: "Progress metrics", body: "Completion, overdue work, and verification backlog across the plan.", selector: ".cap-metrics, .cap-summary-stats" },
        { title: "An initiative", body: "Owner, status, and the evidence attached so far.", selector: ".cap-action-card" },
        { title: "Submit completion evidence", body: "Submitting starts an AI completeness check, then routes the initiative to an administrator for final human verification.", selector: ".cap-action-controls, .cap-card-tools", interact: { event: "click", hint: "Open an initiative's controls to see the available actions." } },
        { title: "Verification state", body: "Verified initiatives are marked explicitly; nothing is auto-approved.", selector: ".cap-verification, .cap-verified" },
        { title: "AI recommendations", body: "Recommended initiatives are derived from current demand gaps and can be accepted or ignored.", selector: ".cap-recommendations, .cap-reco-grid" },
        { title: "Outcomes", body: "What the completed plan changed, measured against the gaps it was created for.", selector: ".cap-outcomes, .cap-analytics" },
      ],
    },
  },
  {
    prefix: "/university/offerings",
    tour: {
      key: "university-offerings",
      label: "Course offerings",
      steps: [
        { title: "Add an offering", body: "New courses and certifications entered here feed straight into curriculum alignment.", selector: ".uo-heading, .uo-page" },
        { title: "Offering details", body: "The skills you attach determine how this offering is scored against demand.", selector: ".uo-form", interact: { event: "input", hint: "Start filling the form to see the guidance react." } },
        { title: "AI support", body: "Suggested skills and descriptions are drafts for you to edit, not final content.", selector: ".uo-ai" },
        { title: "Guidance", body: "Context on how the offering will appear in alignment reporting.", selector: ".uo-aside, .uo-help" },
      ],
    },
  },
  {
    prefix: "/university/analytics",
    tour: {
      key: "university-analytics",
      label: "Analytics",
      steps: [
        { title: "Analytics entry points", body: "This page routes you to the fuller analysis rather than duplicating it.", selector: ".page-title" },
        { title: "Choose a view", body: "Each card opens the workspace where the underlying data can be filtered and acted on.", selector: ".page-shell .grid-2", interact: { event: "click", hint: "Open a view to continue there." } },
      ],
    },
  },
  {
    prefix: "/university/student-readiness",
    tour: {
      key: "university-readiness",
      label: "Student readiness",
      steps: [
        { title: "Student readiness", body: "Per-student and per-cohort readiness scoring is still being built out, so this page is deliberately marked as incomplete rather than filled with placeholder numbers.", selector: ".page-title" },
        { title: "Where the data lives today", body: "Cohort-level coverage against live employer demand is already available on the Executive Dashboard and the Curriculum workspace.", selector: ".page-shell .notice", interact: { event: "click", hint: "Follow the link to the Executive Dashboard." } },
      ],
    },
  },
  {
    prefix: "/university/settings",
    tour: {
      key: "university-settings",
      label: "Settings",
      steps: [
        { title: "Settings hub", body: "Account, workspace display, and support are grouped so nothing is buried in a menu.", selector: ".settings-hub, .page-shell .grid-2" },
        { title: "Institution profile", body: "Manage the verified university identity and sign-in details.", heading: "Institution profile" },
        { title: "Display and accessibility", body: "Text size, contrast, and motion preferences apply across the whole portal.", heading: "Display and accessibility" },
        { title: "Support", body: "Open a trackable support request without leaving the portal.", heading: "Support" },
      ],
    },
  },
  {
    prefix: "/university/profile",
    tour: {
      key: "university-profile",
      label: "Institution account",
      steps: [
        { title: "Institution identity", body: "The verified university identity shown to students and employers.", selector: ".account-identity, .university-profile-details" },
        { title: "Verification", body: "Verification state is displayed rather than assumed.", selector: ".account-verification" },
        { title: "Profile image", body: "Update the image used across the university portal.", selector: ".account-avatar--large" },
        { title: "Security", body: "Change sign-in details for the institution account.", selector: ".account-security" },
      ],
    },
  },

  // ------------------------------------------------------------------ ADMIN
  {
    prefix: "/admin/dashboard",
    tour: {
      key: "admin-dashboard",
      label: "Trust and governance",
      steps: [
        { title: "Human oversight first", body: "These queues contain decisions that require accountable human review. AI may assist, but it does not approve evidence or users.", selector: ".page-title" },
        { title: "Queue volumes", body: "How much is waiting, and where the backlog is concentrated.", selector: ".page-shell .grid-3" },
        { title: "Pending employer accounts", body: "Approving an employer is what lets them publish live opportunities.", heading: "Pending employer accounts" },
        { title: "Certificate submissions", body: "The uploaded certificate is shown next to the decision so you review the evidence, not just the claim.", heading: "Pending certificate submissions" },
        { title: "Evidence preview", body: "Open the submitted file before deciding; the preview is part of the audit record.", selector: ".certificate-preview" },
        { title: "Curriculum evidence", body: "University completion evidence arrives here after its automated completeness check.", heading: "Curriculum completion evidence" },
        { title: "Record your reasoning", body: "Review notes are stored with the decision so it can be explained later.", selector: ".admin-evidence-note", interact: { event: "input", hint: "Write a note to attach it to the decision." } },
      ],
    },
  },
  {
    prefix: "/admin/evidence",
    tour: {
      key: "admin-evidence",
      label: "Evidence audit",
      steps: [
        { title: "Document and link verification", body: "Private documents and public evidence links are reviewed through separate queues.", selector: ".page-title" },
        { title: "Private document review", body: "Files stay private to the submitter, the relevant organization, and you.", heading: "Private document review" },
        { title: "Decide on a document", body: "Approving or rejecting here changes what shows as verified on a student's passport.", selector: ".document-review-row", interact: { event: "click", hint: "Open a document to review it before deciding." } },
        { title: "Evidence links", body: "Public links are checked separately because they can change after submission.", heading: "Submitted evidence links" },
      ],
    },
  },
  {
    prefix: "/admin/governance",
    tour: {
      key: "admin-governance",
      label: "Governance",
      steps: [
        { title: "Governance and human oversight", body: "Simulation, review queues, and the audit trail for every automated decision.", selector: ".page-title" },
        { title: "Scenario simulator", body: "Test how a change to weighting would affect scores before it is applied to anyone.", heading: "Scenario simulator", interact: { event: "submit", hint: "Run a scenario to see its effect." } },
        { title: "Human review queue", body: "Appeals from students who believe an automated result was wrong.", heading: "Human review queue" },
        { title: "Scenario results", body: "Outcomes of past simulations stay recorded for accountability.", heading: "Scenario results" },
        { title: "Pipeline map", body: "Where each automated step sits, and which human checkpoint follows it.", heading: "Operational pipeline map" },
        { title: "Decision audit trail", body: "Every consequential decision, who made it, and the reasoning attached.", heading: "Decision audit trail" },
      ],
    },
  },
  {
    prefix: "/admin/monitoring",
    tour: {
      key: "admin-monitoring",
      label: "Monitoring",
      steps: [
        { title: "Fairness, drift and data sufficiency", body: "Ongoing checks on whether the scoring model still behaves as documented.", selector: ".page-title" },
        { title: "Capture a snapshot", body: "A snapshot freezes the current fairness and drift readings so later measurements have a baseline to move against.", selector: ".page-shell .data-row form button, .page-shell .data-row form", interact: { event: "click", hint: "Capture a snapshot to establish the baseline." } },
        { title: "Current indicators", body: "Live fairness, drift, and sufficiency readings. Below the minimum sample size, conclusions are suppressed rather than reported weakly.", selector: ".page-shell .grid-3" },
        { title: "Monitoring history", body: "Trend over time matters more than any single reading.", heading: "Monitoring history" },
        { title: "Fairness contract", body: "The documented evaluation the monitoring is measured against.", heading: "Fairness evaluation contract" },
      ],
    },
  },
  {
    prefix: "/admin/career-tracks",
    tour: {
      key: "admin-tracks",
      label: "Career tracks",
      steps: [
        { title: "Career tracks and skill weights", body: "Weights defined here drive every readiness score and job match on the platform.", selector: ".page-title" },
        { title: "Existing tracks", body: "Review the current weighting before changing it; students are already scored against it.", selector: ".page-shell .card" },
        { title: "Create a career track", body: "A new track becomes selectable by students as soon as it is saved.", heading: "Create a career track", interact: { event: "submit", hint: "Save a track to publish it." } },
      ],
    },
  },
  {
    prefix: "/admin/data-requests",
    tour: {
      key: "admin-data-requests",
      label: "Data-rights requests",
      steps: [
        { title: "Data-rights requests", body: "Access, download, correction, and deletion requests from users.", selector: ".page-title" },
        { title: "Resolve a request", body: "Deletion is reviewed against records that must be retained lawfully before it is actioned.", selector: ".page-shell .card .data-row, .page-shell .card" },
      ],
    },
  },
  {
    prefix: "/admin/support",
    tour: {
      key: "admin-support",
      label: "Support queue",
      steps: [
        { title: "Support queue", body: "Tickets raised from any portal, grouped by category and status.", selector: ".page-title" },
        { title: "Work a ticket", body: "Assigning and resolving a ticket is recorded against your administrator account.", selector: ".page-shell .card .data-row, .page-shell .card" },
      ],
    },
  },
  {
    prefix: "/admin/profile",
    tour: {
      key: "admin-profile",
      label: "Administrator account",
      steps: [
        { title: "Administrator identity", body: "The account your review decisions are attributed to.", selector: ".account-identity" },
        { title: "Profile image", body: "Update the image shown in the admin header.", selector: ".account-avatar--large" },
        { title: "Security", body: "Change your sign-in details. Administrator access carries the widest permissions on the platform.", selector: ".account-security" },
      ],
    },
  },

  // ----------------------------------------------------------------- SHARED
  {
    prefix: "/workforce-intelligence",
    tour: {
      key: "shared-intelligence",
      label: "Workforce intelligence",
      steps: [
        { title: "Aggregated and anonymized", body: "Only aggregate trends appear here. Individual student data stays inside authorized role views.", selector: ".page-title" },
        { title: "Jump to a section", body: "The contents bar moves you between demand, outcomes, and the responsible-AI notes.", selector: ".page-toc, .page-shell nav", interact: { event: "click", hint: "Open a section from the contents bar." } },
        { title: "Headline signals", body: "Average readiness, distinct requested skills, and outcome records across the platform.", selector: ".page-shell .grid-3" },
        { title: "Industry demand", body: "The most requested skills, ranked by weighted demand points.", selector: "#industry-demand" },
        { title: "Education-employment loop", body: "Applications, shortlists, and open opportunities as a single feedback loop.", selector: "#education-employment-loop" },
        { title: "Responsible AI", body: "The inputs used, how they are weighted, and where human oversight sits.", selector: "#responsible-ai" },
      ],
    },
  },
  {
    prefix: "/support",
    tour: {
      key: "shared-support",
      label: "Support",
      steps: [
        { title: "Help center", body: "Create a trackable request instead of sending an untraceable email.", selector: ".page-title" },
        { title: "Create a ticket", body: "The category decides which team the ticket is routed to.", heading: "Create a support ticket", interact: { event: "submit", hint: "Submit a ticket to see it tracked." } },
        { title: "Specialized help", body: "Appeals, data rights, and Arabic-language support have their own dedicated workflows.", heading: "Specialized help" },
      ],
    },
  },
  {
    prefix: "/ar/support",
    tour: {
      key: "shared-support-ar",
      label: "الدعم",
      steps: [
        { title: "مركز المساعدة", body: "أنشئ طلب دعم يمكن تتبعه بدلاً من رسالة غير موثقة.", selector: ".page-title" },
        { title: "نموذج الدعم", body: "يحدد التصنيف الفريق الذي يستلم الطلب.", selector: ".page-shell .form-grid", interact: { event: "submit", hint: "أرسل الطلب لتتبعه." } },
      ],
    },
  },
  {
    prefix: "/passport/",
    tour: {
      key: "shared-passport-view",
      label: "Shared passport",
      steps: [
        { title: "A shared Skills Passport", body: "This is a time-limited public view the student created and can revoke at any moment.", selector: ".page-title" },
        { title: "Verified evidence only", body: "Verification status is shown next to each entry rather than implied.", selector: ".page-shell .grid-2, .page-shell .card" },
      ],
    },
  },
  {
    prefix: "/policies",
    tour: {
      key: "shared-policy",
      label: "Policy",
      steps: [
        { title: "Policy document", body: "The governing terms for how the platform handles data and automated decisions.", selector: ".page-title" },
        { title: "Full text", body: "Policies are published in full rather than summarized behind a link.", selector: ".page-shell" },
      ],
    },
  },
  {
    prefix: "/ar/policies",
    tour: {
      key: "shared-policy-ar",
      label: "السياسات",
      steps: [
        { title: "وثيقة السياسة", body: "الشروط التي تحكم التعامل مع البيانات والقرارات الآلية.", selector: ".page-title" },
        { title: "النص الكامل", body: "تُنشر السياسات كاملة دون اختصار.", selector: ".page-shell" },
      ],
    },
  },
];

export function tourForPath(pathname: string): Tour | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const hit = routeTours
    .filter((entry) =>
      entry.match
        ? entry.match.test(path)
        : path === entry.prefix.replace(/\/$/, "") || path.startsWith(entry.prefix),
    )
    // A regex entry is always more specific than a prefix entry of the same depth.
    .sort((a, b) => (b.match ? 1 : 0) - (a.match ? 1 : 0) || b.prefix.length - a.prefix.length)[0];
  return hit ? hit.tour : null;
}

export function isPortalPath(role: PortalRole, pathname: string): boolean {
  return pathname.startsWith(`/${role.toLowerCase()}/`);
}
