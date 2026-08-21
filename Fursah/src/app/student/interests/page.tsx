import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { computeJobMatch, computeReadinessScore, getTrackGaps, matchOfferingsToGaps, readinessBand } from "@/lib/ai";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import { dismissCareerSuggestion, exploreSuggestedCareer, setPrimaryCareerTrack, toggleFavoriteCompany, toggleFavoriteCareerTrack } from "@/actions/student";
import { getStudentIntelligence } from "@/lib/intelligence";
import PageToc from "@/components/PageToc";
import CareerMajorSelector from "@/components/CareerMajorSelector";

export default async function StudentInterests({
  searchParams,
}: {
  searchParams: Promise<{ trackQ?: string; companyQ?: string; setup?: string }>;
}) {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");
  const { trackQ = "", companyQ = "", setup = "" } = await searchParams;

  const [student, tracks, employers, offerings, intelligence] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: ctx.student.id },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
        favoriteCompanies: true,
        favoriteCareerTracks: true,
      },
    }),
    getAllCareerTracksAsync(),
    prisma.employer.findMany({
      where: { verificationStatus: "APPROVED" },
      include: {
        jobs: {
          where: { status: "open" },
          include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
        },
      },
      orderBy: { company: "asc" },
    }),
    prisma.offering.findMany({
      include: { university: true, skills: { include: { skill: true } }, certification: true },
    }),
    getStudentIntelligence(ctx.student.id),
  ]);

  const directionSuggestion = intelligence.directionSuggestion;
  const careerMatches = intelligence.careerMatches.slice(0, 5);

  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const favoriteTrackIds = new Set(student.favoriteCareerTracks.map((f) => f.careerTrackId));
  const favoriteEmployerIds = new Set(student.favoriteCompanies.map((f) => f.employerId));

  const favoriteTracks = [...favoriteTrackIds].map((id) => trackById.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const favoriteEmployers = employers.filter((e) => favoriteEmployerIds.has(e.id));
  const hasPrimaryCareer = student.targetCareer !== "undecided" && trackById.has(student.targetCareer);
  const primaryTrack = hasPrimaryCareer ? trackById.get(student.targetCareer) : undefined;
  const primaryReadiness = primaryTrack ? computeReadinessScore(student, primaryTrack) : null;

  const visibleTracks = trackQ
    ? tracks.filter((t) => t.label.toLowerCase().includes(trackQ.trim().toLowerCase()))
    : tracks;
  const visibleEmployers = companyQ
    ? employers.filter((e) => e.company.toLowerCase().includes(companyQ.trim().toLowerCase()))
    : employers;

  return (
    <main className="page-shell student-career-interests">
      <section className="student-design-hero student-interests-hero"><div className="student-hero-copy"><span className="eyebrow">CAREER INTERESTS</span><h1>Career Interests</h1><p>Intelligent discovery and workforce alignment based on your verified profile.</p><div className="student-interest-stats"><span><small>TARGET CAREER</small><b>{primaryTrack?.label ?? "Choose a career"}</b></span><span><small>FOLLOWING</small><b>{favoriteTracks.length} tracks</b></span><span><small>RECOMMENDED</small><b>{Math.max(0,tracks.length-favoriteTracks.length)} careers</b></span><span><small>COMPANIES</small><b>{favoriteEmployers.length} followed</b></span></div><div className="student-ai-callout"><b>✦</b><p><strong>AI Insight:</strong> Following relevant tracks and employers improves your personalized job, course, and certification recommendations.</p></div><div className="student-hero-actions"><a href="#career-tracks">Explore Career Tracks</a><a href="#companies">Explore Companies</a></div></div><aside className="student-score-card"><span>Readiness score</span><strong>{primaryReadiness?.score ?? 0}<small>%</small></strong><div className="bar"><i style={{width:`${primaryReadiness?.score ?? 0}%`}}/></div><p>{primaryReadiness ? readinessBand(primaryReadiness.score).label : "Complete your profile to begin"}</p></aside></section>

      <PageToc
        items={[
          { id: "recommendations", label: "Your matches & recommendations" },
          { id: "career-tracks", label: "Favorite career tracks" },
          { id: "companies", label: "Favorite companies" },
        ]}
      />

      {(setup === "career" || !hasPrimaryCareer) && <section className="card student-career-setup" id="choose-career">
        <span className="eyebrow">Set up your recommendations</span>
        <h2>Choose your career direction</h2>
        <p className="muted">Start with the area closest to your major, then choose a career within it. You can change this later.</p>
        <form action={setPrimaryCareerTrack} className="student-career-selector-form"><CareerMajorSelector tracks={tracks.map(({id,label})=>({id,label}))} initialCareer={hasPrimaryCareer?student.targetCareer:""} careerName="careerTrackId"/><button className="button primary">Save target career</button></form>
      </section>}

      {directionSuggestion.shouldSuggestChange && directionSuggestion.suggestedCareer && (
        <section className="card" style={{ marginTop: 26, borderWidth: 2 }}>
          <span className="eyebrow">CAREER DIRECTION SIGNAL</span>
          <h2>Your activity may be pointing toward {directionSuggestion.suggestedCareer.careerTrackLabel}</h2>
          <p className="muted">{directionSuggestion.reason}</p>
          {directionSuggestion.supportingSignals.length > 0 && (
            <ul className="muted" style={{ fontSize: 12, paddingLeft: 18 }}>
              {directionSuggestion.supportingSignals.slice(0, 4).map((signal, index) => (
                <li key={`${signal.type}-${index}`}>{signal.reason}</li>
              ))}
              {directionSuggestion.disengagementSignals.slice(0, 2).map((signal, index) => (
                <li key={`negative-${signal.type}-${index}`}>{signal.reason}</li>
              ))}
            </ul>
          )}
          <div className="actions" style={{ marginTop: 12 }}>
            <form action={exploreSuggestedCareer}>
              <input type="hidden" name="careerTrackId" value={directionSuggestion.suggestedCareer.careerTrackId} />
              <button className="button primary">Explore this direction</button>
            </form>
            <form action={dismissCareerSuggestion}>
              <input type="hidden" name="careerTrackId" value={directionSuggestion.suggestedCareer.careerTrackId} />
              <button className="button secondary">
                Keep {directionSuggestion.currentCareer?.careerTrackLabel ?? "my current target"}
              </button>
            </form>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            Exploring follows the track so recommendations include it. Your target career is only ever changed by you.
          </p>
        </section>
      )}

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">CAREER MATCHING</span>
        <h2>Careers your evidence currently points to</h2>
        <p className="muted">
          Ranked from readiness against each career track, demonstrated interest in your own activity, and how often
          employers currently request the skills that career needs.
        </p>
        {careerMatches.length ? (
          careerMatches.map((career, index) => (
            <div className="data-row" key={career.careerTrackId}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="pill">#{index + 1}</span>
                  <strong>{career.careerTrackLabel}</strong>
                  {career.careerTrackId === student.targetCareer && <span className="pill">Current target</span>}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Readiness {career.readinessScore}% · Interest {career.interestScore}% · Employer demand{" "}
                  {career.marketDemandScore}%
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {career.reasons.join(" ")}
                </div>
              </div>
              <div className="actions" style={{ flexDirection: "column", alignItems: "flex-end" }}>
                <span className="pill">{career.recommendationScore}% fit</span>
                {career.careerTrackId !== student.targetCareer && (
                  <form action={setPrimaryCareerTrack}>
                    <input type="hidden" name="careerTrackId" value={career.careerTrackId} />
                    <button className="button secondary">Set as target</button>
                  </form>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="notice">
            Career matching appears once career tracks are configured and your passport has structured evidence.
          </div>
        )}
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Model {intelligence.modelVersion}. Recommendations only; Fursah never changes your target career for you.
        </p>
      </section>

      <section className="card student-ai-section" id="recommendations" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">AI career interest matching</span>
        <h2>Your matches & recommendations</h2>

        {favoriteTracks.length === 0 && favoriteEmployers.length === 0 && (
          <div className="notice">Follow a career track or a company below to get personalized matches and recommendations.</div>
        )}

        {favoriteTracks.map((track) => {
          const readiness = computeReadinessScore(student, track);
          const band = readinessBand(readiness.score);
          const gaps = getTrackGaps(student, track);
          const isReady = gaps.missingSkillNames.length === 0 && gaps.missingCertNames.length === 0;
          const openJobsForTrack = employers
            .flatMap((e) => e.jobs.filter((j) => j.careerTrack === track.id).map((j) => ({ job: j, employer: e })))
            .map(({ job, employer }) => ({ employer, job, match: computeJobMatch(student, job) }))
            .sort((a, b) => b.match.score - a.match.score);
          const recommendedOfferings = isReady ? [] : matchOfferingsToGaps(gaps, offerings).slice(0, 3);

          return (
            <article className="card" key={track.id} style={{ marginTop: 14, boxShadow: "none", border: "1px solid #e0e7e3" }}>
              <div className="data-row">
                <div>
                  <strong>{track.label}</strong>
                  <div className="muted">Readiness for this track: {readiness.score}/100</div>
                </div>
                <span className="pill">{band.label}</span>
              </div>

              {isReady ? (
                <div className="notice" style={{ marginTop: 10 }}>
                  You meet the core requirements for {track.label}.{" "}
                  {openJobsForTrack.length
                    ? `${openJobsForTrack.length} open role(s) match this track right now.`
                    : "No open roles in this track yet. You'll be ready the moment one is posted."}
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <strong>What&apos;s missing</strong>
                  <p className="muted">
                    {[...gaps.missingSkillNames, ...gaps.missingCertNames].join(", ")}
                  </p>
                </div>
              )}

              {openJobsForTrack.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Open roles in this track</strong>
                  {openJobsForTrack.slice(0, 3).map(({ job, employer, match }) => (
                    <div className="data-row" key={job.id}>
                      <div><strong>{job.title}</strong><div className="muted">{employer.company}</div></div>
                      <span className="pill">{match.score}% match</span>
                    </div>
                  ))}
                </div>
              )}

              {recommendedOfferings.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Recommended to close the gap</strong>
                  {recommendedOfferings.map(({ offering, coveredSkillNames, coversCertification }) => (
                    <div className="data-row" key={offering.id}>
                      <div>
                        <strong>{offering.title}</strong>
                        <div className="muted">
                          {offering.university.institution} · {offering.type}
                          {coveredSkillNames.length ? ` · covers ${coveredSkillNames.join(", ")}` : ""}
                          {coversCertification ? " · grants the required certification" : ""}
                        </div>
                      </div>
                      {offering.url ? <a className="link" href={offering.url} target="_blank" rel="noreferrer">View →</a> : <span className="pill">No link</span>}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}

        {favoriteEmployers.map((employer) => {
          const jobMatches = employer.jobs
            .map((job) => ({ job, match: computeJobMatch(student, job) }))
            .sort((a, b) => b.match.score - a.match.score);
          const best = jobMatches[0];
          const isReady = best && best.match.score >= 70;
          const gaps = best
            ? { missingSkillNames: best.match.missingSkills, missingCertNames: best.match.missingCerts }
            : { missingSkillNames: [], missingCertNames: [] };
          const recommendedOfferings = !isReady && best ? matchOfferingsToGaps(gaps, offerings).slice(0, 3) : [];

          return (
            <article className="card" key={employer.id} style={{ marginTop: 14, boxShadow: "none", border: "1px solid #e0e7e3" }}>
              <div className="data-row">
                <div>
                  <strong>{employer.company}</strong>
                  <div className="muted">{employer.jobs.length} open role(s)</div>
                </div>
                {best && <span className="pill">{best.match.score}% best match</span>}
              </div>

              {!best && <div className="notice" style={{ marginTop: 10 }}>No open roles right now. You&apos;ll be notified here the moment one is posted.</div>}

              {best && isReady && (
                <div className="notice" style={{ marginTop: 10 }}>
                  You&apos;re a strong match for &ldquo;{best.job.title}&rdquo; ({best.match.score}%). <Link className="link" href="/student/jobs">Apply now →</Link>
                </div>
              )}

              {best && !isReady && (
                <div style={{ marginTop: 10 }}>
                  <strong>Closest role: {best.job.title} ({best.match.score}% match)</strong>
                  <p className="muted">{[...gaps.missingSkillNames, ...gaps.missingCertNames].join(", ") || "Minor gaps only."}</p>
                </div>
              )}

              {recommendedOfferings.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Recommended to close the gap</strong>
                  {recommendedOfferings.map(({ offering, coveredSkillNames, coversCertification }) => (
                    <div className="data-row" key={offering.id}>
                      <div>
                        <strong>{offering.title}</strong>
                        <div className="muted">
                          {offering.university.institution} · {offering.type}
                          {coveredSkillNames.length ? ` · covers ${coveredSkillNames.join(", ")}` : ""}
                          {coversCertification ? " · grants the required certification" : ""}
                        </div>
                      </div>
                      {offering.url ? <a className="link" href={offering.url} target="_blank" rel="noreferrer">View →</a> : <span className="pill">No link</span>}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="card" id="career-tracks" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Career tracks</span>
        <h2>Favorite career tracks</h2>
        <p className="muted">Beyond your primary target career, follow any track you&apos;re curious about.</p>
        <form className="filter-bar" style={{ marginTop: 12 }}>
          <label>Search tracks<input className="input" type="text" name="trackQ" placeholder="e.g. Data" defaultValue={trackQ} /></label>
          <button className="button secondary" type="submit">Search</button>
          {trackQ && <a className="link" href="/student/interests#career-tracks" style={{ alignSelf: "center" }}>Clear</a>}
        </form>
        <div className="stack" style={{ marginTop: 12 }}>
          {visibleTracks.length === 0 && <div className="notice">No career tracks match &ldquo;{trackQ}&rdquo;.</div>}
          {visibleTracks.map((track) => {
            const isFavorite = favoriteTrackIds.has(track.id);
            return (
              <div className="data-row" key={track.id}>
                <span>{track.label}{track.id === student.targetCareer ? " (primary)" : ""}</span>
                <div className="student-track-actions">{track.id !== student.targetCareer && <form action={setPrimaryCareerTrack}><input type="hidden" name="careerTrackId" value={track.id}/><button className="button secondary">Set as target</button></form>}<form action={toggleFavoriteCareerTrack}>
                  <input type="hidden" name="careerTrackId" value={track.id} />
                  <button className={`button ${isFavorite ? "secondary" : "primary"}`}>{isFavorite ? "Following ✓" : "Follow"}</button>
                </form></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" id="companies" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Companies</span>
        <h2>Favorite companies</h2>
        <p className="muted">Follow a company to get matched against every role they post, not just the ones you happen to see.</p>
        <form className="filter-bar" style={{ marginTop: 12 }}>
          <label>Search companies<input className="input" type="text" name="companyQ" placeholder="e.g. Nexariya" defaultValue={companyQ} /></label>
          <button className="button secondary" type="submit">Search</button>
          {companyQ && <a className="link" href="/student/interests#companies" style={{ alignSelf: "center" }}>Clear</a>}
        </form>
        <div className="stack" style={{ marginTop: 12 }}>
          {visibleEmployers.length === 0 && <div className="notice">No companies match &ldquo;{companyQ}&rdquo;.</div>}
          {visibleEmployers.map((employer) => {
            const isFavorite = favoriteEmployerIds.has(employer.id);
            return (
              <div className="data-row" key={employer.id}>
                <div><strong>{employer.company}</strong><div className="muted">{employer.industry ?? "-"} · {employer.jobs.length} open role(s)</div></div>
                <form action={toggleFavoriteCompany}>
                  <input type="hidden" name="employerId" value={employer.id} />
                  <button className={`button ${isFavorite ? "secondary" : "primary"}`}>{isFavorite ? "Following ✓" : "Follow"}</button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
