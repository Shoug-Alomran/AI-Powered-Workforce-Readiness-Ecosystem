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
import { careerCategoryFor } from "@/lib/careerCategories";

export default async function StudentInterests({
  searchParams,
}: {
  searchParams: Promise<{ trackQ?: string; companyQ?: string; companyLetter?: string; setup?: string; careerView?: string; trackCategory?: string; trackStatus?: string }>;
}) {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");
  const { trackQ = "", companyQ = "", companyLetter = "", setup = "", careerView = "", trackCategory = "", trackStatus = "all" } = await searchParams;

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
  const careerMatches = intelligence.careerMatches;
  const visibleCareerMatches = trackQ
    ? careerMatches.filter((career) => career.careerTrackLabel.toLowerCase().includes(trackQ.trim().toLowerCase()))
    : careerMatches;
  const showAllCareers = careerView === "all" || Boolean(trackQ);
  const displayedCareerMatches = showAllCareers ? visibleCareerMatches : visibleCareerMatches.slice(0, 6);

  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const favoriteTrackIds = new Set(student.favoriteCareerTracks.map((f) => f.careerTrackId));
  const favoriteEmployerIds = new Set(student.favoriteCompanies.map((f) => f.employerId));

  const favoriteTracks = [...favoriteTrackIds].map((id) => trackById.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const favoriteEmployers = employers.filter((e) => favoriteEmployerIds.has(e.id));
  const hasPrimaryCareer = student.targetCareer !== "undecided" && trackById.has(student.targetCareer);
  const primaryTrack = hasPrimaryCareer ? trackById.get(student.targetCareer) : undefined;
  const primaryReadiness = primaryTrack ? computeReadinessScore(student, primaryTrack) : null;

  const trackCategories = [...new Set(tracks.map((track) => careerCategoryFor(track.label)))].sort();
  const visibleTracks = tracks.filter((track) => {
    const matchesSearch = !trackQ || track.label.toLowerCase().includes(trackQ.trim().toLowerCase());
    const matchesCategory = !trackCategory || careerCategoryFor(track.label) === trackCategory;
    const matchesStatus = trackStatus === "following" ? favoriteTrackIds.has(track.id) : trackStatus === "available" ? !favoriteTrackIds.has(track.id) : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const companyLetters = [...new Set(employers.map((employer) => employer.company.charAt(0).toUpperCase()))].sort();
  const visibleEmployers = employers.filter((employer) => {
    const matchesSearch = !companyQ || employer.company.toLowerCase().includes(companyQ.trim().toLowerCase());
    const matchesLetter = !companyLetter || employer.company.charAt(0).toUpperCase() === companyLetter.toUpperCase();
    return matchesSearch && matchesLetter;
  });
  const employersByLetter = visibleEmployers.reduce((groups, employer) => {
    const letter = employer.company.charAt(0).toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), employer]);
    return groups;
  }, new Map<string, typeof visibleEmployers>());

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

      <section className="card student-career-explorer" id="career-explorer" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <div className="student-career-explorer-head"><div><span className="eyebrow">CAREER EXPLORER</span><h2>Explore every career path</h2><p className="muted">Compare readiness, demonstrated interest, and current employer demand. Fit is guidance, not a prediction.</p></div><div className="student-career-legend" aria-label="Career readiness color key"><span className="strong">Strong</span><span className="developing">Developing</span><span className="early">Early</span></div></div>
        <form action="/student/interests#career-explorer" className="filter-bar student-career-filter">
          <label htmlFor="career-search">Find a career</label>
          <input className="input" id="career-search" type="search" name="trackQ" placeholder="Search all careers" defaultValue={trackQ}/>
          <button className="button secondary" type="submit">Search</button>
          {trackQ && <a className="link" href="/student/interests">Clear</a>}
          <span>{trackQ ? `${visibleCareerMatches.length} matches` : `${careerMatches.length} careers available`}</span>
        </form>
        {careerMatches.length ? (
          <div className="student-career-grid">
          {displayedCareerMatches.map((career) => {
            const level = career.readinessScore >= 70 ? "strong" : career.readinessScore >= 40 ? "developing" : "early";
            return <article className={`student-career-card ${level}`} key={career.careerTrackId}>
              <header><span className="student-career-rank">#{careerMatches.findIndex(item => item.careerTrackId === career.careerTrackId) + 1}</span><span className="student-career-fit">{career.recommendationScore}% fit</span></header>
              <h3>{career.careerTrackLabel}</h3>
              {career.careerTrackId === student.targetCareer && <span className="student-current-target">Current target</span>}
              <div className="student-career-score"><span><b>{career.readinessScore}%</b><small>Readiness</small></span><span><b>{career.interestScore}%</b><small>Interest</small></span><span><b>{career.marketDemandScore}%</b><small>Demand</small></span></div>
              <div className="student-career-bar" aria-label={`${career.readinessScore}% readiness`}><i style={{width:`${career.readinessScore}%`}}/></div>
              <p>{career.reasons.join(" ") || "Complete more profile evidence to improve this comparison."}</p>
              {career.careerTrackId !== student.targetCareer && <form action={setPrimaryCareerTrack}><input type="hidden" name="careerTrackId" value={career.careerTrackId}/><button className="button secondary">Set as target</button></form>}
            </article>;
          })}
          {visibleCareerMatches.length === 0 && <div className="notice">No careers match &ldquo;{trackQ}&rdquo;.</div>}
          </div>
        ) : (
          <div className="notice">
            Career matching appears once career tracks are configured and your passport has structured evidence.
          </div>
        )}
        <p className="student-career-model muted">
          Model {intelligence.modelVersion}. Recommendations only; Fursah never changes your target career for you.
        </p>
        {!trackQ && careerMatches.length > 6 && <div className="student-career-more">{showAllCareers ? <Link aria-label="Show top careers" className="button secondary" href="/student/interests#career-explorer">Show top careers</Link> : <Link aria-label={`View all ${careerMatches.length} careers`} className="button secondary" href="/student/interests?careerView=all#career-explorer">View all {careerMatches.length} careers</Link>}</div>}
      </section>

      <section className="card student-ai-section" id="recommendations" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">AI career interest matching</span>
        <h2>Your matches & recommendations</h2>

        {favoriteTracks.length === 0 && (
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
                  {openJobsForTrack.map(({ job, employer, match }) => (
                    <Link className="data-row student-recommended-role" href={`/student/jobs?job=${job.id}`} key={job.id}>
                      <div><strong>{job.title}</strong><div className="muted">{employer.company}</div></div>
                      <div className="student-recommended-role-actions"><span className="pill">{match.score}% match</span><span className="button secondary">View details</span></div>
                    </Link>
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

      </section>

      <section className="card student-interest-list-card" id="career-tracks" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Career tracks</span>
        <h2>Favorite career tracks</h2>
        <p className="muted">Beyond your primary target career, follow any track you&apos;re curious about.</p>
        <form action="/student/interests#career-tracks" className="student-track-filter" style={{ marginTop: 16 }}>
          <label>Category<select className="input" name="trackCategory" defaultValue={trackCategory}><option value="">All categories</option>{trackCategories.map(category=><option value={category} key={category}>{category}</option>)}</select></label>
          <label>Career search<input className="input" type="search" name="trackQ" placeholder="Search careers" defaultValue={trackQ}/></label>
          <label>Status<select className="input" name="trackStatus" defaultValue={trackStatus}><option value="all">All careers</option><option value="following">Following</option><option value="available">Not followed</option></select></label>
          <div className="student-track-filter-action"><span aria-hidden="true">Action</span><button className="button secondary" type="submit">Apply filters</button></div>
          <div className="student-track-filter-summary"><span>{visibleTracks.length} careers</span>{(trackQ || trackCategory || trackStatus !== "all") && <a className="link" href="/student/interests#career-tracks">Clear filters</a>}</div>
        </form>
        <div className="stack student-interest-list" style={{ marginTop: 12 }}>
          {visibleTracks.length === 0 && <div className="notice">No career tracks match &ldquo;{trackQ}&rdquo;.</div>}
          {visibleTracks.map((track) => {
            const isFavorite = favoriteTrackIds.has(track.id);
            return (
              <div className="data-row student-interest-list-row" key={track.id}>
                <div className="student-track-identity"><small>{careerCategoryFor(track.label)}</small><span>{track.label}{track.id === student.targetCareer ? " (primary)" : ""}</span></div>
                <div className="student-track-actions">{track.id !== student.targetCareer && <form action={setPrimaryCareerTrack}><input type="hidden" name="careerTrackId" value={track.id}/><button className="button secondary">Set as target</button></form>}<form action={toggleFavoriteCareerTrack}>
                  <input type="hidden" name="careerTrackId" value={track.id} />
                  <button className={`button ${isFavorite ? "secondary" : "primary"}`}>{isFavorite ? "Following ✓" : "Follow"}</button>
                </form></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card student-interest-list-card" id="companies" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Companies</span>
        <h2>Favorite companies</h2>
        <p className="muted">Follow a company to get matched against every role they post, not just the ones you happen to see.</p>
        <p className="muted student-company-disclaimer">Company directory listings support exploration and do not imply a partnership with Fursah or an active vacancy.</p>
        <nav className="student-company-letters" aria-label="Browse companies by first letter">
          <Link className={!companyLetter ? "active" : ""} href="/student/interests#companies">All</Link>
          {companyLetters.map((letter) => <Link className={companyLetter === letter ? "active" : ""} href={`/student/interests?companyLetter=${letter}#companies`} key={letter}>{letter}</Link>)}
        </nav>
        <form action="/student/interests#companies" className="student-company-filter">
          {companyLetter && <input type="hidden" name="companyLetter" value={companyLetter} />}
          <label>Search companies<input className="input" type="search" name="companyQ" placeholder="Search by company name" defaultValue={companyQ} /></label>
          <div className="student-company-filter-action"><span aria-hidden="true">Action</span><button className="button secondary" type="submit">Search</button></div>
          {(companyQ || companyLetter) && <a className="link" href="/student/interests#companies">Clear filters</a>}
          <span className="student-company-count">{visibleEmployers.length} companies</span>
        </form>
        <div className="stack student-interest-list" style={{ marginTop: 12 }}>
          {visibleEmployers.length === 0 && <div className="notice">No companies match &ldquo;{companyQ}&rdquo;.</div>}
          {[...employersByLetter.entries()].map(([letter, letterEmployers]) => <section className="student-company-letter-group" key={letter} aria-labelledby={`companies-${letter}`}><h3 id={`companies-${letter}`}>{letter}</h3>{letterEmployers.map((employer) => {
            const isFavorite = favoriteEmployerIds.has(employer.id);
            return (
              <div className="data-row student-interest-list-row" key={employer.id}>
                <div><strong>{employer.company}</strong><div className="muted">{employer.industry ?? "-"} · {employer.jobs.length} open role(s)</div></div>
                <form action={toggleFavoriteCompany}>
                  <input type="hidden" name="employerId" value={employer.id} />
                  <button className={`button ${isFavorite ? "secondary" : "primary"}`}>{isFavorite ? "Following ✓" : "Follow"}</button>
                </form>
              </div>
            );
          })}</section>)}
        </div>
      </section>
    </main>
  );
}
