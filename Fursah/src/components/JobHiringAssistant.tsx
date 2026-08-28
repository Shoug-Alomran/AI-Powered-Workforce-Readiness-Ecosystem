"use client";

import { useEffect, useState } from "react";
import { evaluateJobQuality } from "@/lib/intelligence/jobQuality";
import type { JobQualityResult } from "@/lib/intelligence/types";

/**
 * Draft-time feedback on a role being written.
 *
 * It used to run a heuristic of its own and present the result as an "AI
 * Quality Score". Two problems with that. It was a second answer to a question
 * the platform already answers - `evaluateJobQuality` produces "Requirement
 * quality" on the published role - and the two disagreed by 13 to 50 points on
 * every role in the demo data, so an employer tuned a draft against a number
 * that changed the moment they published. And it was labelled AI, while the
 * Responsible AI Policy states that every score is deterministic and rule-based
 * with published weights, which this is.
 *
 * It now calls the same function the published role uses, so what you see while
 * drafting is what you get after publishing, and it is named for what it is.
 */
function readForm(form: HTMLFormElement): JobQualityResult {
  const data = new FormData(form);
  const text = (key: string) => String(data.get(key) ?? "").trim();

  // "Name:weight" pairs, the same shape createJob parses.
  const parse = (raw: string, requirementType: "ESSENTIAL" | "PREFERRED") =>
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => ({
        weight: Math.min(3, Math.max(1, Number(entry.split(":")[1]) || 2)),
        requirementType,
      }));

  return evaluateJobQuality({
    id: "draft",
    title: text("title"),
    careerTrack: text("careerTrack"),
    description: text("description") || null,
    minExperience: Number(data.get("minExperience") ?? 0) || 0,
    requiredSkills: [
      ...parse(text("skills"), "ESSENTIAL"),
      ...parse(text("preferredSkills"), "PREFERRED"),
    ],
    requiredCerts: text("certifications")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((certificationId) => ({ certificationId })),
  });
}

const EMPTY: JobQualityResult = {
  jobId: "draft",
  score: 0,
  completenessScore: 0,
  requirementQualityScore: 0,
  marketRealismScore: 0,
  issues: ["Begin entering role information to see how complete it is."],
  strengths: [],
};

export default function JobHiringAssistant({
  studentPoolSize,
  studentsTargetingTrack,
  careerTrackLabel,
}: {
  studentPoolSize: number;
  studentsTargetingTrack: number;
  careerTrackLabel: string | null;
}) {
  const [quality, setQuality] = useState<JobQualityResult>(EMPTY);

  useEffect(() => {
    const form = document.getElementById("create-job-form") as HTMLFormElement | null;
    if (!form) return;
    const update = () => setQuality(readForm(form));
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    window.addEventListener("fursah:draft-saved", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
      window.removeEventListener("fursah:draft-saved", update);
    };
  }, []);

  return (
    <section className="pjob-assistant">
      <header>
        <h2>◫　Requirement quality</h2>
        <small>UPDATES AS YOU TYPE</small>
      </header>

      <div className="pjob-score">
        <span style={{ background: `conic-gradient(#6d5dfb ${quality.score * 3.6}deg,#e5e7eb 0)` }}>
          <b>{quality.score}</b>
          <small>/100</small>
        </span>
        <div>
          <b>Requirement quality</b>
          <p>
            {quality.score >= 80
              ? "Strong clarity. Candidates should understand the role and its expectations."
              : "Complete the role details to improve matching quality."}
          </p>
        </div>
      </div>

      <h3>WHAT WOULD IMPROVE IT</h3>
      <ul>
        {quality.issues.length ? (
          quality.issues.slice(0, 3).map((issue) => <li key={issue}>{issue}</li>)
        ) : (
          <li>The opportunity contains the information needed for candidate matching.</li>
        )}
      </ul>

      <div className="pjob-insights">
        <span>
          <small>TALENT POOL</small>
          <b>
            {studentPoolSize} <em>profiles on Fursah</em>
          </b>
        </span>
        <span>
          <small>{careerTrackLabel ? `TARGETING ${careerTrackLabel.toUpperCase()}` : "TARGETING THIS TRACK"}</small>
          <b>{studentsTargetingTrack}</b>
        </span>
        <span>
          <small>MARKET REALISM</small>
          <b>{quality.marketRealismScore}</b>
        </span>
      </div>

      <p className="muted" style={{ padding: "0 16px 16px", fontSize: 9, lineHeight: 1.5 }}>
        This is the same deterministic check the published role reports, so the score will not change on
        publishing. Match against real candidate profiles is calculated once the role exists. Fursah does not
        estimate a time-to-fill: no historical hiring-duration data is recorded.
      </p>
    </section>
  );
}
