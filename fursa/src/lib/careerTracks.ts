// Career taxonomy used by the AI engine to power roadmaps, readiness scoring,
// and adaptive learning recommendations. In production this would be learned
// from the ITU AI-RE style Knowledge Base (employer feedback + job postings);
// here it is a seeded, explainable reference table so the prototype is fully
// functional without external data.

export type CareerTrack = {
  id: string;
  label: string;
  technicalSkills: { name: string; weight: 1 | 2 | 3 }[];
  softSkills: { name: string; weight: 1 | 2 | 3 }[];
  certifications: string[];
  recommendedExperienceMonths: number;
};

export const CAREER_TRACKS: CareerTrack[] = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    technicalSkills: [
      { name: "JavaScript", weight: 3 },
      { name: "TypeScript", weight: 2 },
      { name: "React", weight: 3 },
      { name: "Node.js", weight: 2 },
      { name: "SQL", weight: 2 },
      { name: "Git", weight: 2 },
      { name: "System Design", weight: 1 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["AWS Certified Cloud Practitioner", "Meta Front-End Developer"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    technicalSkills: [
      { name: "Python", weight: 3 },
      { name: "SQL", weight: 3 },
      { name: "Machine Learning", weight: 3 },
      { name: "Statistics", weight: 2 },
      { name: "Data Visualization", weight: 2 },
      { name: "Pandas", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Critical Thinking", weight: 2 },
    ],
    certifications: ["Google Data Analytics", "AWS Certified Machine Learning"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "cybersecurity-specialist",
    label: "Cybersecurity Specialist",
    technicalSkills: [
      { name: "Network Security", weight: 3 },
      { name: "Linux", weight: 2 },
      { name: "Python", weight: 1 },
      { name: "Threat Analysis", weight: 3 },
      { name: "Cloud Security", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Attention to Detail", weight: 3 },
      { name: "Communication", weight: 1 },
    ],
    certifications: ["ISC2 CC", "CompTIA Security+", "Cisco CCNA"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "financial-analyst",
    label: "Financial Analyst",
    technicalSkills: [
      { name: "Excel", weight: 3 },
      { name: "Financial Modeling", weight: 3 },
      { name: "SQL", weight: 1 },
      { name: "Data Visualization", weight: 2 },
      { name: "Accounting", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Attention to Detail", weight: 2 },
    ],
    certifications: ["PMI Project Management", "CFA Level I"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "ux-designer",
    label: "UX Designer",
    technicalSkills: [
      { name: "Figma", weight: 3 },
      { name: "User Research", weight: 3 },
      { name: "Wireframing", weight: 2 },
      { name: "Prototyping", weight: 2 },
      { name: "HTML/CSS", weight: 1 },
    ],
    softSkills: [
      { name: "Communication", weight: 3 },
      { name: "Empathy", weight: 3 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["Google UX Design"],
    recommendedExperienceMonths: 4,
  },
];

export function getCareerTrack(id: string): CareerTrack {
  return (
    CAREER_TRACKS.find((c) => c.id === id) ?? CAREER_TRACKS[0]
  );
}

export function allSkillNames(): { name: string; category: "technical" | "soft" }[] {
  const map = new Map<string, "technical" | "soft">();
  for (const track of CAREER_TRACKS) {
    for (const s of track.technicalSkills) map.set(s.name, "technical");
    for (const s of track.softSkills) map.set(s.name, "soft");
  }
  return Array.from(map.entries()).map(([name, category]) => ({ name, category }));
}

export function allCertificationNames(): string[] {
  const set = new Set<string>();
  for (const track of CAREER_TRACKS) {
    for (const c of track.certifications) set.add(c);
  }
  return Array.from(set);
}
