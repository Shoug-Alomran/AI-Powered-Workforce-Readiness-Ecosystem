// The people behind Fursah, rendered by /team.
//
// This is the single place to edit the team page. Add, remove or reorder
// entries here — the page lays out whatever this array contains.
//
// Every field except `name`, `role` and `bio` is optional: omit `links`,
// `focus`, `email` or `initials` and the card simply drops that part.
// `initials` defaults to the first letter of the first two words of `name`.

export type TeamLink = {
  /** Shown on the chip, e.g. "LinkedIn", "GitHub", "Portfolio". */
  label: string;
  href: string;
};

export type TeamMember = {
  name: string;
  /** Role on this project, not a job title. */
  role: string;
  /** One or two sentences, first person plural avoided — write it as a bio. */
  bio: string;
  /** Short tags for what this person owned. */
  focus?: string[];
  email?: string;
  links?: TeamLink[];
  initials?: string;
};

export const teamIntro = {
  eyebrow: "The team",
  title: "The people behind Fursah.",
  lead: "Fursah began as a question about why a country producing more graduates than ever still struggled to match them to the right roles. The answer we kept arriving at was not more data, but better explanations. The team below built the platform around that idea — readiness that a student can act on, matches an employer can audit, and curriculum signals a university can use within a term.",
};

export const team: TeamMember[] = [
  {
    name: "Shoug Alomran",
    role: "Full-stack engineer",
    bio: "I’m a curious and driven Software Engineering and Cybersecurity student at Prince Sultan University with a deep passion for technology, data security, and innovation. I thrive on having a full plate; balancing projects, research, and creative pursuits keeps me learning and growing every day. I love tackling complex challenges, finding smart solutions, and turning ideas into impact, all while constantly pushing myself to do more and do it better.",
    focus: ["Product direction", "Readiness scoring", "Explainable matching", "Next.js & Prisma"],
    email: "shoug.alomran@fursah.org",
    links: [
      { label: "GitHub", href: "https://github.com/Shoug-Alomran" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/shoug-alomran/" },
      { label: "Personal Website", href: "https://shoug-tech.com/about/" },
    ],
  }, {
    name: "Lolwah Alsaadoun",
    role: "Full-stack engineer",
    bio: "I’m passionate about Artificial Intelligence, technology, and the possibilities they create for solving real-world problems. My interests span AI, machine learning, software development, and building intelligent solutions that are both practical and impactful. I enjoy turning ideas into working solutions, exploring new technologies, and continuously strengthening my technical and problem- solving skills.I’m especially interested in opportunities that challenge me to think creatively, collaborate with others, and apply what I know in meaningful ways. Driven by curiosity and a desire to keep evolving, I’m always looking to take on new challenges, contribute to impactful projects, and connect with people who are shaping the future of technology.",
    focus: ["Product direction", "Readiness scoring", "Explainable matching", "Next.js & Prisma"],
    email: "lolwah.alsaadoun@fursah.org",
    links: [
      { label: "GitHub", href: "https://github.com/Lolwah-sa" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/lolwah-alsaadoun/" },
    ],
  }, {
    name: "Renad Alsulaiman",
      role: "?",
      bio: "?",
      focus: ["?"],
    email: "renad.alsulaiman@fursah.org",
    links: [
      { label: "GitHub", href: "https://github.com/Renad-Alsulaiman" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/renad-alsulaiman/" },
    ],
  }, {
    name: "Taleen Bin Nader",
    role: "?",
    bio: "?",
    focus: ["?"],
    email: "taleen.binnader@fursah.org",
    links: [
      { label: "GitHub", href: "https://github.com/Taleen-Bin-Nader" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/taleen-bin-nader/" },
    ],
  },
];

/** Shared values statements shown under the roster. */
export const teamValues = [
  {
    title: "Explainable by default",
    body: "Nothing the platform recommends is allowed to be unexplainable. Every score and every match carries the evidence that produced it.",
  },
  {
    title: "Students own their evidence",
    body: "Credentials, transcripts and project work belong to the student. Sharing is opt-in, scoped, and revocable at any time.",
  },
  {
    title: "Built for the Saudi market",
    body: "Career tracks, curriculum mapping and employer demand signals are modelled on Saudi institutions and Vision 2030 workforce targets, not imported wholesale.",
  },
];

export function memberInitials(member: TeamMember): string {
  if (member.initials) return member.initials;
  return member.name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}
