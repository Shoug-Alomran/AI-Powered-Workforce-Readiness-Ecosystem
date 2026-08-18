import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { memberInitials, team, teamIntro, teamValues } from "@/lib/team";

export const metadata: Metadata = {
  title: "Team | Fursah",
  description: "The people who built Fursah — the AI-powered workforce readiness ecosystem connecting Saudi students, employers and universities.",
};

export default function TeamPage() {
  return <main className="imp team-page">
    <SiteHeader />

    <div className="imp-shell">
      <section className="imp-hero">
        <span className="imp-eyebrow">{teamIntro.eyebrow}</span>
        <h1 className="imp-title">{teamIntro.title}</h1>
        <p className="imp-lead">{teamIntro.lead}</p>
      </section>

      <section className="imp-section" id="members">
        <header>
          <span className="imp-kicker">Who we are</span>
          <h2>{team.length === 1 ? "Project team" : `${team.length} people, one platform`}</h2>
          <p>Each of us owned a slice of the ecosystem end to end, from the data model through to the interface a student actually sees.</p>
        </header>
        <div className="team-grid">
          {team.map((member) => <article className="team-card" key={member.name}>
            <div className="team-card-head">
              <span className="team-avatar" aria-hidden>{memberInitials(member)}</span>
              <div>
                <h3>{member.name}</h3>
                <small>{member.role}</small>
              </div>
            </div>
            <p className="team-bio">{member.bio}</p>
            {member.focus && member.focus.length > 0 && <ul className="team-focus">
              {member.focus.map((item) => <li key={item}>{item}</li>)}
            </ul>}
            {(member.links?.length || member.email) && <div className="team-links">
              {member.links?.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label} <span aria-hidden>↗</span></a>)}
              {member.email && <a href={`mailto:${member.email}`}>Email</a>}
            </div>}
          </article>)}
        </div>
      </section>

      <section className="imp-section" id="principles">
        <header>
          <span className="imp-kicker">How we build</span>
          <h2>Three commitments the platform is held to</h2>
        </header>
        <div className="imp-three">
          {teamValues.map((value, i) => <article key={value.title}>
            <span className="imp-num">{String(i + 1).padStart(2, "0")}</span>
            <h3>{value.title}</h3>
            <p>{value.body}</p>
          </article>)}
        </div>
      </section>

      <section className="imp-end">
        <h2>Want to talk to us about Fursah?</h2>
        <p>We are happy to walk through the readiness model, the matching logic, or the university curriculum-alignment work in detail.</p>
        <div><Link href="/support">Contact the team</Link><Link href="/impact" className="secondary">Read the national impact case</Link></div>
      </section>
    </div>
  </main>;
}
