import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import RouteSkeleton from "@/components/RouteSkeleton";
import { getCurrentStudent } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { applyToJob, toggleBookmark } from "@/actions/student";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import type { Prisma } from "@/generated/prisma/client";
import DocumentUpload from "@/components/DocumentUpload";
import { isRecentGraduate, RECENT_GRADUATE_YEARS } from "@/lib/studentOnboarding";

// The shell is prerenderable; everything that reads the session or the query
// string lives inside the boundary below, so the page can be served from the
// CDN while the personalised half streams in.
export default function Jobs({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; q?: string; job?: string; sort?: string; application?: string; apply?: string; graduate?: string }>;
}) {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <JobsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function JobsContent({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; q?: string; job?: string; sort?: string; application?: string; apply?: string; graduate?: string }>;
}) {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");

  const { track: trackFilter = "", q = "", job: selectedJobId = "", sort = "recommended", application = "available", apply = "", graduate = "" } = await searchParams;
  const graduateOnly = graduate === "1";
  const applicationView = application === "submitted" ? "submitted" : "available";

  const where: Prisma.JobWhereInput = {
    employer: { verificationStatus: "APPROVED" },
    ...(selectedJobId ? { id: selectedJobId } : {}),
    ...(trackFilter ? { careerTrack: trackFilter } : {}),
    // The student's own choice, applied to the listing only. It narrows what
    // they are shown; it does not change any score.
    ...(graduateOnly ? { recentGraduatesAccepted: true } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { employer: { company: { contains: q } } },
          ],
        }
      : {}),
  };

  // Only the student's id is needed to build these, so the profile load runs
  // alongside them rather than in front of them.
  const [student, jobs, tracks, offerings] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: ctx.student.id },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
        applications: true,
        feedbacks: { orderBy: { checkpointDays: "asc" } },
        bookmarks: true,
      },
    }),
    prisma.job.findMany({
      where,
      include: { employer: true, requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getAllCareerTracksAsync(),
    prisma.offering.findMany({
      include: { university: true, skills: { include: { skill: true } } },
    }),
  ]);

  // One lookup built once, rather than a query per job: which offering closes a
  // given skill gap, so a missing requirement can be shown next to the course
  // that addresses it.
  const offeringBySkill = new Map<string, { title: string; institution: string; url: string | null }>();
  for (const offering of offerings) {
    for (const entry of offering.skills) {
      const key = entry.skill.name.trim().toLowerCase();
      if (!offeringBySkill.has(key)) {
        offeringBySkill.set(key, {
          title: offering.title,
          institution: offering.university.institution,
          url: offering.url,
        });
      }
    }
  }

  // Read from the year the student supplied on their own passport, never
  // inferred from anything else, and used only to word the flag below and to
  // offer the filter. It is not part of any score.
  const studentIsRecentGraduate = isRecentGraduate(student.graduationYear);

  const verifiedCertificationCount = student.certifications.filter(
    (entry) => entry.verificationStatus === "APPROVED",
  ).length;

  const unverifiedCertificationCount = student.certifications.length - verifiedCertificationCount;
  const rankedJobs = jobs
    .map((job) => ({ job, match: computeJobMatch(student, job) }))
    .sort((a, b) => {
      if (sort === "least-recommended") return a.match.score - b.match.score;
      if (sort === "newest") return b.job.createdAt.getTime() - a.job.createdAt.getTime();
      if (sort === "least-experience") return a.job.minExperience - b.job.minExperience;
      if (sort === "most-experience") return b.job.minExperience - a.job.minExperience;
      return b.match.score - a.match.score;
    });
  const appliedJobIds = new Set(student.applications.map((entry) => entry.jobId));
  const availableJobs = rankedJobs.filter(({ job }) => job.status === "open" && !appliedJobIds.has(job.id));
  const submittedJobs = rankedJobs.filter(({ job }) => appliedJobIds.has(job.id));
  const displayedJobs = selectedJobId
    ? rankedJobs
    : applicationView === "submitted"
      ? submittedJobs
      : availableJobs;

  const experienceLabel = (months: number) => {
    if (months === 0) return "No minimum experience";
    if (months < 12) return `${months} month${months === 1 ? "" : "s"} minimum experience`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} year${years === 1 ? "" : "s"}${remainingMonths ? ` and ${remainingMonths} month${remainingMonths === 1 ? "" : "s"}` : ""} minimum experience`;
  };

  return (
    <main className="page-shell student-job-discovery">
      <span className="eyebrow">Explainable matching</span>
      <h1 className="page-title">Opportunities matched to you</h1>
      <p className="muted student-jobs-intro">Explore open roles, compare your strongest matches, and review the requirements you can still develop.</p>
      {apply === "portfolio-required" && (
        <div className="auth-error student-upload-error">
          That role requires a CV, portfolio or work sample. Attach one to the application below and submit again. Nothing was sent.
        </div>
      )}
      {apply === "upload-failed" && (
        <div className="auth-error student-upload-error">
          Your application was recorded, but the attachment could not be stored. Open the role and attach the file again.
        </div>
      )}
      <p className="muted" style={{ fontSize: 13 }}>
        Your match scores include {verifiedCertificationCount} human-verified certification{verifiedCertificationCount === 1 ? "" : "s"}.
        {unverifiedCertificationCount > 0
          ? ` ${unverifiedCertificationCount} submitted certification(s) are still awaiting review and do not yet count towards a match.`
          : ""}
      </p>

      {selectedJobId && <Link className="button secondary student-job-back" href={`/student/jobs?application=${applicationView}#opportunity-results`}>← View all opportunities</Link>}

      {!selectedJobId && <nav className="student-application-tabs" aria-label="Application views">
        <Link className={applicationView === "available" ? "is-active" : ""} href="/student/jobs?application=available#opportunity-results">
          <span><strong>Available opportunities</strong><small>Roles you have not applied to</small></span><b>{availableJobs.length}</b>
        </Link>
        <Link className={applicationView === "submitted" ? "is-active" : ""} href="/student/jobs?application=submitted#opportunity-results">
          <span><strong>Submitted applications</strong><small>Review your application status</small></span><b>{submittedJobs.length}</b>
        </Link>
      </nav>}

      {!selectedJobId && <form action="/student/jobs#opportunity-results" className="card student-job-filters">
        <input type="hidden" name="application" value={applicationView} />
        <label>
          Career track
          <select className="input" name="track" defaultValue={trackFilter}>
            <option value="">All career tracks</option>
            {tracks.map((t) => (
              <option value={t.id} key={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input className="input" name="q" placeholder="Job title or company" defaultValue={q} />
        </label>
        <label>
          Sort opportunities
          <select className="input" name="sort" defaultValue={sort}>
            <option value="recommended">Most recommended</option>
            <option value="least-recommended">Least recommended</option>
            <option value="newest">Newest first</option>
            <option value="least-experience">Lowest experience requirement</option>
            <option value="most-experience">Highest experience requirement</option>
          </select>
        </label>
        <label className="student-job-graduate-filter">
          Career stage
          <span>
            <input type="checkbox" name="graduate" value="1" defaultChecked={graduateOnly} />
            Only roles that welcome recent graduates
          </span>
          <small className="muted">Counts as recent if you graduated in the last {RECENT_GRADUATE_YEARS} years or have not graduated yet.</small>
        </label>
        <div className="student-job-filter-action"><span aria-hidden="true">Action</span><button className="button secondary" type="submit">Apply filters</button></div>
        <div className="student-job-filter-summary">{!student.graduationYear && <Link className="link" href="/student/profile#career-profile">Add your graduation year to see which roles welcome recent graduates</Link>}<span>{displayedJobs.length} {applicationView === "submitted" ? "submitted application" : "available opportunit"}{displayedJobs.length === 1 ? (applicationView === "submitted" ? "" : "y") : (applicationView === "submitted" ? "s" : "ies")}</span>{(trackFilter || q || graduateOnly || sort !== "recommended") && <Link className="link" href={`/student/jobs?application=${applicationView}#opportunity-results`}>Clear filters</Link>}</div>
      </form>}

      <div className="stack student-job-results" id="opportunity-results" style={{ marginTop: 18 }}>
        {displayedJobs.length === 0 && <div className="notice">{applicationView === "submitted" ? "You have no submitted applications that match these filters." : "No available opportunities match these filters."}</div>}
        {displayedJobs.map(({ job, match: m }) => {
          const applicationRecord = student.applications.find((entry) => entry.jobId === job.id);
          const applied = Boolean(applicationRecord);
          const saved = student.bookmarks.some((b) => b.jobId === job.id);
          const jobFeedbacks = student.feedbacks.filter((feedback) => feedback.jobId === job.id);
          const matchLevel = m.score >= 70 ? "strong" : m.score >= 40 ? "developing" : "early";
          const remainingRequirements = [...m.missingSkills, ...m.missingCerts, m.experienceGapMonths ? `${m.experienceGapMonths} additional month${m.experienceGapMonths === 1 ? "" : "s"} of relevant experience` : ""].filter(Boolean);
          return (
            <article className="card student-job-card" key={job.id}>
              <header className="student-job-card-header"><div><span className={`student-job-match ${matchLevel}`}>{m.score}% match</span><h2>{job.title}</h2><p><strong>{job.employer.company}</strong><span>{experienceLabel(job.minExperience)}</span>{job.portfolioRequired && <span className="student-job-flag">CV or portfolio required</span>}{job.recentGraduatesAccepted && <span className="student-job-flag is-welcome">{studentIsRecentGraduate ? "Welcomes recent graduates like you" : "Recent graduates welcome"}</span>}</p></div><span className={`student-job-status${applied ? " is-submitted" : ""}`}>{applicationRecord ? ({ applied: "Submitted", shortlisted: "Shortlisted", hired: "Offer received", rejected: "Not selected" }[applicationRecord.status] ?? "Submitted") : saved ? "Saved" : "Open"}</span></header>
              <section className="student-job-about"><h3>About this opportunity</h3><p className="student-job-description">{job.description}</p></section>
              <div className="grid-2 student-job-match-grid">
                <div>
                  <strong>What already matches</strong>
                  {m.matchedSkills.length ? <ul>{m.matchedSkills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p className="muted">No required skills are verified yet. Add evidence to your Skills Passport to improve this comparison.</p>}
                </div>
                <div>
                  <strong>Requirements to work on</strong>
                  {remainingRequirements.length ? <ul>{remainingRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul> : <p className="muted">Your verified profile meets the main listed requirements.</p>}
                </div>
              </div>
              <div className="notice student-job-explanation"><strong>Why you received this score</strong><p>{m.explanation}</p></div>

              {applied && <section className="student-employment-details" aria-labelledby={`employment-${job.id}`}>
                <header>
                  <div><span className="eyebrow">Application and employment record</span><h3 id={`employment-${job.id}`}>Your history with this opportunity</h3></div>
                  <span className="student-employment-count">{jobFeedbacks.length} employer review{jobFeedbacks.length === 1 ? "" : "s"}</span>
                </header>
                <dl className="student-application-metadata">
                  <div><dt>Application status</dt><dd>{applicationRecord ? ({ applied: "Submitted", shortlisted: "Shortlisted", hired: "Hired", rejected: "Not selected" }[applicationRecord.status] ?? "Submitted") : "Submitted"}</dd></div>
                  <div><dt>Applied on</dt><dd>{applicationRecord?.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
                  <div><dt>Role status</dt><dd>{job.status === "open" ? "Open" : "Closed"}</dd></div>
                  <div><dt>Recorded match</dt><dd>{applicationRecord?.matchScore ?? m.score}%</dd></div>
                </dl>
                {applicationRecord?.decisionReason && <div className="student-application-note"><strong>Employer decision</strong><p>{applicationRecord.decisionReason}</p></div>}
                {applicationRecord?.note && <div className="student-application-note"><strong>Application note</strong><p>{applicationRecord.note}</p></div>}
                {jobFeedbacks.length > 0 ? <div className="student-employer-reviews">
                  {jobFeedbacks.map((feedback) => {
                    const average = Math.round(((feedback.technical + feedback.communication + feedback.teamwork + feedback.problemSolving + feedback.adaptability + feedback.overall) / 6) * 20);
                    return <article id={`feedback-${feedback.id}`} key={feedback.id}>
                      <header><div><strong>{feedback.checkpointDays}-day employer review</strong><small>Submitted {feedback.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</small></div><span>{average}% overall</span></header>
                      <div className="student-feedback-score-grid">
                        {[{ label: "Technical", value: feedback.technical }, { label: "Communication", value: feedback.communication }, { label: "Teamwork", value: feedback.teamwork }, { label: "Problem solving", value: feedback.problemSolving }, { label: "Adaptability", value: feedback.adaptability }, { label: "Overall", value: feedback.overall }].map((score) => <div key={score.label}><span>{score.label}</span><strong>{score.value}/5</strong></div>)}
                      </div>
                      <div className="student-feedback-notes"><strong>Employer comments</strong><p>{feedback.notes || "No written comments were provided for this review."}</p></div>
                    </article>;
                  })}
                </div> : <p className="muted student-feedback-empty">No employer performance review has been submitted for this opportunity yet.</p>}
              </section>}

              {m.missingSkills.length > 0 && (
                <div className="student-job-skills">
                  <strong>Highest-impact skills for this role</strong>
                  {job.requiredSkills
                    .filter((requirement) => m.missingSkills.includes(requirement.skill.name))
                    .sort(
                      (a, b) =>
                        b.weight - a.weight ||
                        Number(b.requirementType === "ESSENTIAL") - Number(a.requirementType === "ESSENTIAL"),
                    )
                    .slice(0, 3)
                    .map((requirement) => {
                      const offering = offeringBySkill.get(requirement.skill.name.trim().toLowerCase());
                      return (
                        <div className="data-row" key={requirement.id}>
                          <div>
                            <strong>{requirement.skill.name}</strong>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {requirement.requirementType === "PREFERRED" ? "Preferred" : "Essential"} · importance{" "}
                              {requirement.weight}/3
                              {offering ? ` · taught by ${offering.title} (${offering.institution})` : ""}
                            </div>
                          </div>
                          {offering?.url ? (
                            <a className="link" href={offering.url} target="_blank" rel="noreferrer">
                              View course →
                            </a>
                          ) : (
                            <span className="pill">Gap</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
              <footer className={`student-job-card-footer${applied ? " student-application-footer" : ""}`}>
                {applicationRecord ? <div className="student-application-summary"><span>Application status</span><strong>{({ applied: "Submitted", shortlisted: "Shortlisted", hired: "Offer received", rejected: "Not selected" }[applicationRecord.status] ?? "Submitted")}</strong><small>Submitted {applicationRecord.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small></div> : <form action={applyToJob} className="student-job-apply-form">
                  <input type="hidden" name="jobId" value={job.id} />
                  {job.portfolioRequired && (
                    <p className="student-job-required-note">
                      This employer requires a CV, portfolio or work sample. Attach one below to apply.
                    </p>
                  )}
                  <DocumentUpload
                    label={job.portfolioRequired ? "CV or portfolio (required)" : "Application documents"}
                    required={job.portfolioRequired}
                    compact
                  />
                  <button className="button primary student-job-apply-button">Apply now</button>
                </form>}
                <form action={toggleBookmark} className="student-job-save-form">
                  <input type="hidden" name="jobId" value={job.id} />
                  <button className="button secondary">{saved ? "Saved ✓" : "Save"}</button>
                </form>
              </footer>
            </article>
          );
        })}
      </div>
    </main>
  );
}
