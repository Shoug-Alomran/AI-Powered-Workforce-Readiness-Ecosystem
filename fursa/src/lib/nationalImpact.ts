// National-impact evidence base for the /impact page.
//
// VERIFICATION CONTRACT
// Every figure below carries `status`. "TODO_VERIFY" means the number is a
// working placeholder and MUST be replaced with the exact published figure
// from `sourceUrl` before this page is submitted or shown publicly. The page
// renders a visible warning banner for as long as any TODO_VERIFY remains, so
// an unchecked number can never be mistaken for a cited one.
//
// To verify: open the source, find the figure for the stated `year`, correct
// `value` if it differs, then change `status` to "verified".

export type StatStatus = "verified" | "TODO_VERIFY";

export type Stat = {
  id: string;
  label: string;
  value: number;
  unit: "people" | "percent";
  year: number;
  source: string;
  sourceUrl: string;
  status: StatStatus;
  note?: string;
};

/** The headline decade comparison the page is built around. */
export const graduateTrend: { earlier: Stat; latest: Stat } = {
  earlier: {
    id: "graduates-earlier",
    label: "Higher-education graduates",
    value: 190_000,
    unit: "people",
    year: 2014,
    source: "Ministry of Education / GASTAT — Higher Education Graduates bulletin",
    sourceUrl: "https://www.stats.gov.sa/",
    status: "TODO_VERIFY",
    note: "Use total graduates across all levels (bachelor and above) so both years are counted the same way.",
  },
  latest: {
    id: "graduates-latest",
    label: "Higher-education graduates",
    value: 300_000,
    unit: "people",
    year: 2024,
    source: "Ministry of Education / GASTAT — Higher Education Graduates bulletin",
    sourceUrl: "https://www.stats.gov.sa/",
    status: "TODO_VERIFY",
    note: "Use the most recent published year available; update the year field to match.",
  },
};

/** Labour-market context showing that graduate volume alone did not close the gap. */
export const labourIndicators: Stat[] = [
  {
    id: "unemployment-earlier",
    label: "Saudi unemployment rate",
    value: 11.7,
    unit: "percent",
    year: 2014,
    source: "GASTAT — Labour Market Statistics",
    sourceUrl: "https://www.stats.gov.sa/",
    status: "TODO_VERIFY",
  },
  {
    id: "unemployment-latest",
    label: "Saudi unemployment rate",
    value: 7.1,
    unit: "percent",
    year: 2024,
    source: "GASTAT — Labour Market Statistics",
    sourceUrl: "https://www.stats.gov.sa/",
    status: "TODO_VERIFY",
    note: "Vision 2030 set a 7% target for this indicator; note in the text whether it has been met.",
  },
  {
    id: "female-participation-earlier",
    label: "Female labour force participation",
    value: 17.4,
    unit: "percent",
    year: 2016,
    source: "GASTAT — Labour Market Statistics",
    sourceUrl: "https://www.stats.gov.sa/",
    status: "TODO_VERIFY",
    note: "2016 is the Vision 2030 baseline year, which is why it is used instead of 2014 here.",
  },
  {
    id: "female-participation-latest",
    label: "Female labour force participation",
    value: 36.2,
    unit: "percent",
    year: 2024,
    source: "GASTAT — Labour Market Statistics",
    sourceUrl: "https://www.stats.gov.sa/",
    status: "TODO_VERIFY",
    note: "Vision 2030 target was 30%; this indicator passed its target ahead of schedule.",
  },
];

/** How the platform maps onto national strategy. */
export const visionAlignment: { program: string; commitment: string; fursah: string }[] = [
  {
    program: "Human Capability Development Program",
    commitment:
      "Develop a resilient education system aligned with labour-market needs and equip citizens with globally competitive skills.",
    fursah:
      "The curriculum-alignment engine compares what universities teach against live employer skill demand, turning the alignment gap into a measurable, reportable figure.",
  },
  {
    program: "Vision 2030 — Thriving Economy, Rewarding Opportunities",
    commitment:
      "Reduce unemployment among Saudi nationals and raise the share of citizens in productive private-sector work.",
    fursah:
      "Explainable matching surfaces candidates by evidenced skills rather than credentials alone, shortening time-to-hire and widening the pool employers consider.",
  },
  {
    program: "National Transformation — data-driven government",
    commitment:
      "Base education and workforce policy on measurable, timely evidence instead of lagging annual surveys.",
    fursah:
      "The workforce-intelligence layer aggregates anonymized demand and readiness signals continuously, giving institutions evidence between statistical releases.",
  },
];

/** UN Sustainable Development Goals this project contributes to. */
export const sdgAlignment: {
  goal: number;
  title: string;
  target: string;
  targetText: string;
  fursah: string;
}[] = [
  {
    goal: 4,
    title: "Quality Education",
    target: "4.4",
    targetText:
      "Substantially increase the number of youth and adults who have relevant skills, including technical and vocational skills, for employment and decent jobs.",
    fursah:
      "Readiness scoring names the specific skills a learner is missing for a target role, and the roadmap converts that gap into concrete learning actions.",
  },
  {
    goal: 8,
    title: "Decent Work and Economic Growth",
    target: "8.5",
    targetText:
      "Achieve full and productive employment and decent work for all women and men, including for young people, and equal pay for work of equal value.",
    fursah:
      "Matching is driven by evidenced capability rather than personal characteristics, and every ranking carries a human-readable justification.",
  },
  {
    goal: 8,
    title: "Decent Work and Economic Growth",
    target: "8.6",
    targetText:
      "Substantially reduce the proportion of youth not in employment, education or training.",
    fursah:
      "The education-to-employment loop is designed to catch graduates before they leave the system unplaced, by flagging readiness gaps while they are still enrolled.",
  },
  {
    goal: 5,
    title: "Gender Equality",
    target: "5.5",
    targetText:
      "Ensure women's full and effective participation and equal opportunities for leadership at all levels of decision-making in economic life.",
    fursah:
      "Protected characteristics are excluded from ranking inputs, and outcomes are monitored for uneven impact across groups.",
  },
  {
    goal: 10,
    title: "Reduced Inequalities",
    target: "10.3",
    targetText:
      "Ensure equal opportunity and reduce inequalities of outcome, including by eliminating discriminatory practices.",
    fursah:
      "Students from any institution are assessed against the same published criteria, and any automated result can be appealed to a named human reviewer.",
  },
];

export const referenceSources: { name: string; url: string; use: string }[] = [
  {
    name: "GASTAT — General Authority for Statistics",
    url: "https://www.stats.gov.sa/",
    use: "Graduate counts, unemployment, and labour force participation.",
  },
  {
    name: "Vision 2030 official portal and Annual Report",
    url: "https://www.vision2030.gov.sa/",
    use: "Programme commitments, KPI baselines, and progress against targets.",
  },
  {
    name: "Human Capability Development Program",
    url: "https://www.vision2030.gov.sa/en/explore/programs/human-capability-development-program",
    use: "Education-to-labour-market alignment objectives.",
  },
  {
    name: "UN Department of Economic and Social Affairs — SDG targets",
    url: "https://sdgs.un.org/goals",
    use: "Official wording of SDG targets 4.4, 5.5, 8.5, 8.6, and 10.3.",
  },
  {
    name: "Saudi Arabia Voluntary National Review",
    url: "https://hlpf.un.org/countries/saudi-arabia",
    use: "National reporting on SDG progress.",
  },
];

/** Every figure on the page, for the verification banner. */
export const allStats: Stat[] = [graduateTrend.earlier, graduateTrend.latest, ...labourIndicators];

export const unverifiedCount = allStats.filter((s) => s.status === "TODO_VERIFY").length;

export function formatStat(stat: Stat): string {
  return stat.unit === "percent" ? `${stat.value}%` : stat.value.toLocaleString("en-US");
}

/** Percentage change between the two graduate-trend points. */
export function graduateGrowthPercent(): number {
  const { earlier, latest } = graduateTrend;
  return Math.round(((latest.value - earlier.value) / earlier.value) * 100);
}
