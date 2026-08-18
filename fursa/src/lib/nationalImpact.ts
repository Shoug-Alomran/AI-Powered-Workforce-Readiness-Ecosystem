// Evidence base for the /impact page.
//
// Every figure below was checked against the cited source in August 2026.
// `confidence` records how directly it is sourced:
//   "primary"  , published by the issuing authority (GASTAT, UNESCO, Vision 2030)
//   "reported" , an authority's figure carried by a news outlet, cited to both
// Update `checked` when a figure is re-verified.

export type Confidence = "primary" | "reported";

export type Stat = {
  id: string;
  label: string;
  display: string;
  value: number;
  period: string;
  source: string;
  sourceUrl: string;
  confidence: Confidence;
  note?: string;
};

export const CHECKED = "August 2026";

/** Headline: graduate output roughly a decade apart. */
export const graduateTrend: { earlier: Stat; latest: Stat } = {
  earlier: {
    id: "graduates-earlier",
    label: "Graduates per year",
    display: "~130,000",
    value: 130_000,
    period: "reported 2016",
    source: "Ministry of Education figure, reported by Al-Wasat (15 Feb 2016)",
    sourceUrl: "https://www.alwasatnews.com/news/1080118.html",
    confidence: "reported",
    note: "The Ministry's annual graduate figure as reported in early 2016. Rounded in the original, so it is shown as an approximation.",
  },
  latest: {
    id: "graduates-latest",
    label: "Graduates in 2023",
    display: "238,603",
    value: 238_603,
    period: "2023",
    source: "Council of Universities Affairs (مجلس شؤون الجامعات)",
    sourceUrl: "https://www.cua.gov.sa/",
    confidence: "reported",
    note: "Bachelor 170,503 · associate diploma 40,378 · master's 12,467 · higher diploma 10,263 · partner diploma 3,619 · doctorate 1,373.",
  },
};

/** Mid-point, so the trend is not read from two endpoints alone. */
export const graduateMidpoint: Stat = {
  id: "graduates-2018",
  label: "Graduates in 2018",
  display: "212,981",
  value: 212_981,
  period: "2018",
  source: "Ministry of Education, via UNESCO country profile",
  sourceUrl: "https://www.unesco.org/gem-report/en/2026-gem-report-country-case-studies/saudi-arabia",
  confidence: "reported",
  note: "86.7% bachelor's, 9.3% intermediate diploma, 4.0% postgraduate.",
};

/** The distribution argument: output grew, but concentrated in some fields. */
export const fieldMix: { field: string; from: number; to: number }[] = [
  { field: "Business administration", from: 7, to: 34 },
  { field: "Engineering", from: 4, to: 11 },
  { field: "ICT", from: 6, to: 10 },
];

export const fieldMixSource: Pick<Stat, "period" | "source" | "sourceUrl" | "confidence"> = {
  period: "2009 and 2020",
  source: "UNESCO Global Education Monitoring Report: Saudi Arabia case study",
  sourceUrl: "https://www.unesco.org/gem-report/en/2026-gem-report-country-case-studies/saudi-arabia",
  confidence: "primary",
};

/** Labour-market indicators, each as a before/after pair. */
export const indicatorPairs: { id: string; label: string; from: Stat; to: Stat; target: string }[] = [
  {
    id: "unemployment",
    label: "Unemployment rate, Saudi nationals",
    target: "Vision 2030 target of 7% was met in 2024, six years early. The new target is 5%.",
    from: {
      id: "unemployment-baseline",
      label: "Vision 2030 baseline",
      display: "11.6%",
      value: 11.6,
      period: "2016 baseline",
      source: "Vision 2030 programme baseline",
      sourceUrl: "https://www.vision2030.gov.sa/",
      confidence: "primary",
    },
    to: {
      id: "unemployment-latest",
      label: "Most recent quarter",
      display: "6.8%",
      value: 6.8,
      period: "Q2 2025",
      source: "GASTAT Labour Force Survey, reported by Argaam",
      sourceUrl: "https://www.argaam.com/en/article/articledetail/id/1846443",
      confidence: "reported",
      note: "Saudi male unemployment 4.3%; Saudi female unemployment 11.3%.",
    },
  },
  {
    id: "female-participation",
    label: "Female labour force participation",
    target: "The Vision 2030 target of 30% was passed ahead of schedule. The revised endpoint is 40%.",
    from: {
      id: "female-baseline",
      label: "Around Vision 2030 launch",
      display: "~17%",
      value: 17,
      period: "2016–2017",
      source: "Widely reported Vision 2030 launch-era baseline",
      sourceUrl: "https://www.hrsd.gov.sa/en/knowledge-centre/articles/progress-saudi-labor-market",
      confidence: "reported",
    },
    to: {
      id: "female-latest",
      label: "Most recent GASTAT release",
      display: "36.2%",
      value: 36.2,
      period: "Q3 2024",
      source: "GASTAT",
      sourceUrl: "https://www.stats.gov.sa/en/w/news/6",
      confidence: "primary",
      note: "Female employment-to-population ratio 31.3%; Saudi male participation 66.9%.",
    },
  },
];

/** Tertiary enrolment, for scale. */
export const enrolment: Stat[] = [
  {
    id: "enrolment-2006",
    label: "Tertiary enrolment",
    display: "640,000",
    value: 640_000,
    period: "2006",
    source: "UNESCO Global Education Monitoring Report",
    sourceUrl: "https://www.unesco.org/gem-report/en/2026-gem-report-country-case-studies/saudi-arabia",
    confidence: "primary",
  },
  {
    id: "enrolment-2016",
    label: "Tertiary enrolment",
    display: "1,620,000",
    value: 1_620_000,
    period: "2016",
    source: "UNESCO Global Education Monitoring Report",
    sourceUrl: "https://www.unesco.org/gem-report/en/2026-gem-report-country-case-studies/saudi-arabia",
    confidence: "primary",
  },
];

export const visionAlignment: { program: string; commitment: string; fursah: string }[] = [
  {
    program: "Human Capability Development Program",
    commitment:
      "Develop a resilient education system aligned with labour-market needs and equip citizens with globally competitive skills.",
    fursah:
      "The curriculum-alignment engine compares what universities teach against live employer skill demand, turning the alignment gap into a measurable figure an institution can act on.",
  },
  {
    program: "Thriving Economy: Rewarding Opportunities",
    commitment:
      "Reduce unemployment among Saudi nationals and raise the share of citizens in productive private-sector work.",
    fursah:
      "Explainable matching surfaces candidates by evidenced skills rather than credentials alone, shortening time-to-hire and widening the pool employers consider.",
  },
  {
    program: "A data-driven public sector",
    commitment:
      "Base education and workforce policy on measurable, timely evidence rather than lagging annual surveys.",
    fursah:
      "The workforce-intelligence layer aggregates anonymized demand and readiness signals continuously, giving institutions evidence between statistical releases.",
  },
];

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
      "Substantially increase the number of youth and adults who have relevant skills, including technical and vocational skills, for employment, decent jobs and entrepreneurship.",
    fursah:
      "Readiness scoring names the specific skills a learner is missing for a target role, and the roadmap converts that gap into concrete learning actions.",
  },
  {
    goal: 8,
    title: "Decent Work and Economic Growth",
    target: "8.5",
    targetText:
      "Achieve full and productive employment and decent work for all women and men, including for young people and persons with disabilities, and equal pay for work of equal value.",
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
      "Ensure women's full and effective participation and equal opportunities for leadership at all levels of decision-making in political, economic and public life.",
    fursah:
      "Protected characteristics are excluded from ranking inputs, and outcomes are monitored for uneven impact across groups.",
  },
  {
    goal: 10,
    title: "Reduced Inequalities",
    target: "10.3",
    targetText:
      "Ensure equal opportunity and reduce inequalities of outcome, including by eliminating discriminatory laws, policies and practices.",
    fursah:
      "Students from any institution are assessed against the same published criteria, and any automated result can be appealed to a named human reviewer.",
  },
];

export const referenceSources: { name: string; url: string; use: string }[] = [
  {
    name: "GASTAT: General Authority for Statistics",
    url: "https://www.stats.gov.sa/en/w/news/6",
    use: "Labour force participation and unemployment, Q3 2024.",
  },
  {
    name: "GASTAT Labour Force Survey, Q2 2025 (via Argaam)",
    url: "https://www.argaam.com/en/article/articledetail/id/1846443",
    use: "Most recent unemployment rate for Saudi nationals.",
  },
  {
    name: "Council of Universities Affairs",
    url: "https://www.cua.gov.sa/",
    use: "Graduate totals for 2023 with degree-level breakdown.",
  },
  {
    name: "UNESCO Global Education Monitoring Report: Saudi Arabia",
    url: "https://www.unesco.org/gem-report/en/2026-gem-report-country-case-studies/saudi-arabia",
    use: "Tertiary enrolment growth and the shift in graduate field mix.",
  },
  {
    name: "Vision 2030 official portal",
    url: "https://www.vision2030.gov.sa/",
    use: "Programme commitments, KPI baselines and targets.",
  },
  {
    name: "United Nations: Sustainable Development Goals",
    url: "https://sdgs.un.org/goals",
    use: "Official wording of targets 4.4, 5.5, 8.5, 8.6 and 10.3.",
  },
];

export function graduateGrowthPercent(): number {
  const { earlier, latest } = graduateTrend;
  return Math.round(((latest.value - earlier.value) / earlier.value) * 100);
}
