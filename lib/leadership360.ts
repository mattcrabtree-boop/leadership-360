export const PRIVACY_CONFIG = {
  minProtectedCohortSize: 2,
  protectedCohorts: ["direct", "peers", "junior"],
} as const;

export const COHORT_LABELS = {
  manager: "Manager",
  direct: "Direct reports",
  peers: "Peers",
  senior: "Senior colleagues",
  junior: "Junior colleagues",
  self: "Self assessment",
} as const;

export type CohortKey = keyof typeof COHORT_LABELS;

export type ManagerInput = {
  id: string;
  name: string;
  jobTitle: string;
  reportPeriod: string;
  expectedResponses?: number;
};

export type ResponseInput = {
  managerId: string;
  responseId: string;
  relationship: string;
  scores: Record<string, number | null | undefined>;
  questionComments?: Record<string, string | null | undefined>;
  strengths?: string | null;
  development?: string | null;
  otherFeedback?: string | null;
};

export type SafeMetric = {
  score: number | null;
  respondents: number | null;
  ratings: number | null;
  status: "shown" | "withheld";
};

export type SafeCohortMetric = SafeMetric & {
  key: string;
  label: string;
  pooled: boolean;
};

export type SafeScope = {
  allColleagues: SafeMetric;
  self: SafeMetric;
  cohorts: SafeCohortMetric[];
  cohortDetailStatus: "shown" | "withheld";
  range: { low: number; high: number } | null;
  rangeNote: string;
  privacyNote: string | null;
};

type InternalMetric = {
  key: CohortKey;
  label: string;
  score: number | null;
  respondents: number;
  ratings: number;
  scoreTotal: number;
};

const RELATIONSHIP_MAP: Record<string, CohortKey> = {
  "i am a direct report": "direct",
  "direct reports": "direct",
  direct: "direct",
  "i am more junior than them but not a direct report": "junior",
  "junior colleagues": "junior",
  junior: "junior",
  "i am their manager": "manager",
  manager: "manager",
  "i am more senior than them but not their manager": "senior",
  "senior colleagues": "senior",
  senior: "senior",
  "i am a peer": "peers",
  peers: "peers",
  peer: "peers",
  "i am this person (self assessment)": "self",
  "self assessment": "self",
  self: "self",
};

export const THEMES = [
  {
    id: "federate",
    number: "01",
    name: "Federate & Give Meaning",
    description: "Creating shared direction and commitment",
    questionIds: ["Q03", "Q04", "Q05"],
  },
  {
    id: "client",
    number: "02",
    name: "Be Client Focused",
    description: "Making client and partner needs central to decisions",
    questionIds: ["Q06", "Q07", "Q08"],
  },
  {
    id: "inclusion",
    number: "03",
    name: "Promote Inclusion & Respect of the Code of Conduct",
    description: "Leading fairly, ethically and inclusively",
    questionIds: ["Q09", "Q10", "Q11"],
  },
  {
    id: "empower",
    number: "04",
    name: "Support & Empower Teams with Risk Consciousness",
    description: "Balancing autonomy, support and appropriate control",
    questionIds: ["Q12", "Q13", "Q14"],
  },
  {
    id: "agility",
    number: "05",
    name: "Promote Transversality & Agility",
    description: "Working across boundaries and adapting quickly",
    questionIds: ["Q15", "Q16", "Q17", "Q18"],
  },
] as const;

export const QUESTIONS = [
  { id: "Q03", themeId: "federate", text: "Articulates the Leasing Solutions UK vision and priorities to inspire performance" },
  { id: "Q04", themeId: "federate", text: "Motivates and engages teams with clarity and commitment to strategic goals" },
  { id: "Q05", themeId: "federate", text: "Leads through change with direction and reassurance" },
  { id: "Q06", themeId: "client", text: "Prioritises customer and partner needs in decision making" },
  { id: "Q07", themeId: "client", text: "Demonstrates commercial awareness and understanding of market dynamics" },
  { id: "Q08", themeId: "client", text: "Identifies opportunities to enhance client relationships" },
  { id: "Q09", themeId: "inclusion", text: "Fosters an inclusive environment where diverse perspectives are heard" },
  { id: "Q10", themeId: "inclusion", text: "Role models fair, respectful and ethical leadership" },
  { id: "Q11", themeId: "inclusion", text: "Encourages openness, trust and constructive challenge" },
  { id: "Q12", themeId: "empower", text: "Empowers teams by balancing autonomy with support" },
  { id: "Q13", themeId: "empower", text: "Delegates responsibility and trusts others to lead" },
  { id: "Q14", themeId: "empower", text: "Manages risk appropriately without unnecessary control" },
  { id: "Q15", themeId: "agility", text: "Collaborates across teams and breaks down silos" },
  { id: "Q16", themeId: "agility", text: "Adapts with agility to changing business needs" },
  { id: "Q17", themeId: "agility", text: "Is approachable and accessible beyond formal settings" },
  { id: "Q18", themeId: "agility", text: "Seeks efficiencies and enables effective decision making" },
] as const;

function normaliseRelationship(value: string): CohortKey {
  const cohort = RELATIONSHIP_MAP[value.trim().toLowerCase()];
  if (!cohort) throw new Error(`Unknown relationship: ${value}`);
  return cohort;
}

function validScore(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}

function metricFor(
  rows: Array<ResponseInput & { cohort: CohortKey }>,
  cohort: CohortKey,
  questionIds: readonly string[],
): InternalMetric {
  const cohortRows = rows.filter((row) => row.cohort === cohort);
  const validRows = cohortRows.filter((row) => questionIds.some((id) => validScore(row.scores[id])));
  const scores = validRows.flatMap((row) =>
    questionIds.map((id) => row.scores[id]).filter(validScore),
  );
  const scoreTotal = scores.reduce((sum, score) => sum + score, 0);
  return {
    key: cohort,
    label: COHORT_LABELS[cohort],
    score: scores.length ? scoreTotal / scores.length : null,
    respondents: validRows.length,
    ratings: scores.length,
    scoreTotal,
  };
}

function combineMetrics(metrics: InternalMetric[]): SafeCohortMetric {
  const ratings = metrics.reduce((sum, metric) => sum + metric.ratings, 0);
  const scoreTotal = metrics.reduce((sum, metric) => sum + metric.scoreTotal, 0);
  return {
    key: "combined",
    label: "Combined colleague group",
    score: ratings ? scoreTotal / ratings : null,
    respondents: metrics.reduce((sum, metric) => sum + metric.respondents, 0),
    ratings,
    pooled: true,
    status: "shown",
  };
}

function publicMetric(metric: InternalMetric): SafeCohortMetric {
  return {
    key: metric.key,
    label: metric.label,
    score: metric.score,
    respondents: metric.respondents,
    ratings: metric.ratings,
    pooled: false,
    status: "shown",
  };
}

function aggregateMetrics(metrics: InternalMetric[]): SafeMetric {
  const respondents = metrics.reduce((sum, metric) => sum + metric.respondents, 0);
  const ratings = metrics.reduce((sum, metric) => sum + metric.ratings, 0);
  const scoreTotal = metrics.reduce((sum, metric) => sum + metric.scoreTotal, 0);
  return {
    score: ratings ? scoreTotal / ratings : null,
    respondents,
    ratings,
    status: "shown",
  };
}

export function buildSafeScope(
  responses: ResponseInput[],
  questionIds: readonly string[],
  config: { minProtectedCohortSize: number; protectedCohorts: readonly string[] } = PRIVACY_CONFIG,
): SafeScope {
  const rows = responses.map((row) => ({ ...row, cohort: normaliseRelationship(row.relationship) }));
  const self = metricFor(rows, "self", questionIds);
  const colleagueKeys: CohortKey[] = ["manager", "direct", "peers", "senior", "junior"];
  const metrics = colleagueKeys
    .map((cohort) => metricFor(rows, cohort, questionIds))
    .filter((metric) => metric.respondents > 0);
  const all = aggregateMetrics(metrics);

  if ((all.respondents ?? 0) < config.minProtectedCohortSize) {
    return {
      allColleagues: { score: null, respondents: null, ratings: null, status: "withheld" },
      self: publicMetric(self),
      cohorts: [],
      cohortDetailStatus: "withheld",
      range: null,
      rangeNote: "There are not enough visible colleague groups to show a range.",
      privacyNote: "Colleague results are withheld because the response base is below the confidentiality threshold.",
    };
  }

  const protectedSet = new Set(config.protectedCohorts);
  const protectedMetrics = metrics.filter((metric) => protectedSet.has(metric.key));
  const unsafe = protectedMetrics.filter(
    (metric) => metric.respondents < config.minProtectedCohortSize,
  );
  let displayed: SafeCohortMetric[] = [];
  let privacyNote: string | null = null;

  if (unsafe.length) {
    const pooled = [...unsafe];
    let pooledCount = pooled.reduce((sum, metric) => sum + metric.respondents, 0);
    const eligible = protectedMetrics
      .filter((metric) => !pooled.includes(metric))
      .sort((a, b) => a.respondents - b.respondents || a.key.localeCompare(b.key));
    while (pooledCount < config.minProtectedCohortSize && eligible.length) {
      const next = eligible.shift();
      if (!next) break;
      pooled.push(next);
      pooledCount += next.respondents;
    }

    if (pooledCount < config.minProtectedCohortSize) {
      return {
        allColleagues: all,
        self: publicMetric(self),
        cohorts: [],
        cohortDetailStatus: "withheld",
        range: null,
        rangeNote: "There are not enough visible colleague groups to show a range.",
        privacyNote: "The cohort breakdown is withheld because a small group could otherwise be identified by subtraction.",
      };
    }

    const pooledKeys = new Set(pooled.map((metric) => metric.key));
    displayed = metrics
      .filter((metric) => !pooledKeys.has(metric.key))
      .map(publicMetric);
    displayed.push(combineMetrics(pooled));
    privacyNote = "Small protected cohorts have been pooled into a neutral combined group. Their separate scores and counts are not included.";
  } else {
    displayed = metrics.map(publicMetric);
  }

  const order = ["manager", "direct", "peers", "senior", "junior", "combined"];
  displayed.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const rangeValues = displayed
    .map((metric) => metric.score)
    .filter((score): score is number => typeof score === "number");
  const range = rangeValues.length >= 2
    ? { low: Math.min(...rangeValues), high: Math.max(...rangeValues) }
    : null;

  return {
    allColleagues: all,
    self: publicMetric(self),
    cohorts: displayed,
    cohortDetailStatus: "shown",
    range,
    rangeNote: range
      ? "Range compares only colleague groups that remain visible after small groups are combined."
      : "There are not enough visible colleague groups to show a range.",
    privacyNote,
  };
}

function hash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function redactComment(text: string, redactionTerms: readonly string[]): string {
  let clean = text.trim().replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email redacted]");
  for (const term of redactionTerms.filter(Boolean)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    clean = clean.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "[name redacted]");
  }
  return clean.replace(/\s+/g, " ");
}

type CommentItem = { respondentId: string; text: string };

export function stableCommentShuffle(
  comments: CommentItem[],
  seed: string,
  redactionTerms: readonly string[] = [],
): string[] {
  const pool = comments
    .map((comment, index) => ({
      ...comment,
      text: redactComment(comment.text, redactionTerms),
      order: hash32(`${seed}|${comment.respondentId}|${index}|${comment.text}`),
    }))
    .filter((comment) => comment.text.length > 0)
    .sort((a, b) => a.order - b.order || a.text.localeCompare(b.text));

  const shuffled: typeof pool = [];
  while (pool.length) {
    const previous = shuffled.at(-1)?.respondentId;
    const nextIndex = pool.findIndex((comment) => comment.respondentId !== previous);
    const [next] = pool.splice(nextIndex >= 0 ? nextIndex : 0, 1);
    shuffled.push(next);
  }
  return shuffled.map(({ text }) => text);
}

function collectComment(
  rows: ResponseInput[],
  value: (row: ResponseInput) => string | null | undefined,
): CommentItem[] {
  return rows
    .map((row) => ({ respondentId: row.responseId, text: value(row)?.trim() ?? "" }))
    .filter((comment) => comment.text.length > 0);
}

export function buildManagerReport(
  manager: ManagerInput,
  allResponses: ResponseInput[],
  options: {
    privacy?: { minProtectedCohortSize: number; protectedCohorts: readonly string[] };
    redactionTerms?: readonly string[];
  } = {},
) {
  const privacy = options.privacy ?? PRIVACY_CONFIG;
  const redactionTerms = options.redactionTerms ?? [];
  const responses = allResponses.filter((row) => row.managerId === manager.id);
  const colleagueResponses = responses.filter(
    (row) => normaliseRelationship(row.relationship) !== "self",
  );
  const questionResults = QUESTIONS.map((question) => ({
    ...question,
    scope: buildSafeScope(responses, [question.id], privacy),
  }));
  const themeResults = THEMES.map((theme) => ({
    ...theme,
    scope: buildSafeScope(responses, theme.questionIds, privacy),
    questions: questionResults.filter((question) => question.themeId === theme.id),
  }));
  const allQuestionIds = QUESTIONS.map((question) => question.id);
  const overview = buildSafeScope(responses, allQuestionIds, privacy);
  const ranked = questionResults
    .filter((question) => typeof question.scope.allColleagues.score === "number")
    .map((question) => ({ id: question.id, text: question.text, score: question.scope.allColleagues.score as number }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const byQuestion = Object.fromEntries(
    QUESTIONS.map((question) => [
      question.id,
      stableCommentShuffle(
        collectComment(colleagueResponses, (row) => row.questionComments?.[question.id]),
        `${manager.id}|question|${question.id}`,
        redactionTerms,
      ),
    ]),
  );

  const openFeedback = {
    strengths: stableCommentShuffle(
      collectComment(colleagueResponses, (row) => row.strengths),
      `${manager.id}|open|strengths`,
      redactionTerms,
    ),
    development: stableCommentShuffle(
      collectComment(colleagueResponses, (row) => row.development),
      `${manager.id}|open|development`,
      redactionTerms,
    ),
    other: stableCommentShuffle(
      collectComment(colleagueResponses, (row) => row.otherFeedback),
      `${manager.id}|open|other`,
      redactionTerms,
    ),
  };

  return {
    manager: { ...manager },
    reportType: "illustrative",
    generatedFrom: "disclosure-safe synthetic fixture",
    responseSummary: {
      total: responses.length,
      colleagues: colleagueResponses.length,
      expected: manager.expectedResponses ?? null,
    },
    overview,
    themes: themeResults,
    priorities: {
      strengths: ranked.slice(0, 5),
      development: [...ranked].reverse().slice(0, 5),
    },
    comments: { byQuestion, ...openFeedback },
  };
}

export function buildSeparatedReports(
  managers: ManagerInput[],
  responses: ResponseInput[],
  options: Parameters<typeof buildManagerReport>[2] = {},
) {
  const ids = new Set<string>();
  for (const manager of managers) {
    if (ids.has(manager.id)) throw new Error(`Duplicate manager ID: ${manager.id}`);
    ids.add(manager.id);
  }
  for (const response of responses) {
    if (!ids.has(response.managerId)) {
      throw new Error(`Response ${response.responseId} references unknown manager ${response.managerId}`);
    }
  }
  return Object.fromEntries(
    managers.map((manager) => [manager.id, buildManagerReport(manager, responses, options)]),
  );
}
