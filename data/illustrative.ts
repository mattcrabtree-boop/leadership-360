import { QUESTIONS, type ManagerInput, type ResponseInput } from "@/lib/leadership360";

export const illustrativeManager: ManagerInput = {
  id: "M01",
  name: "Alex Morgan",
  jobTitle: "Managing Director, Commercial Partnerships",
  reportPeriod: "May 2026",
  expectedResponses: 18,
};

const baseScores = [4.3, 4.5, 4.1, 4.4, 3.9, 4.2, 4.6, 4.7, 4.3, 4.0, 3.8, 4.2, 4.5, 4.0, 4.6, 3.7];
const selfScores = [4, 4, 4, 4, 4, 4, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4];
const cohorts = [
  ["self", 1, 0],
  ["manager", 2, 0.05],
  ["direct", 1, -0.15],
  ["peers", 1, 0.1],
  ["senior", 6, 0.12],
  ["junior", 7, -0.08],
] as const;

function boundedScore(base: number, cohortOffset: number, personIndex: number, questionIndex: number) {
  const variation = [-0.45, 0.15, 0.45, -0.15][(personIndex + questionIndex) % 4];
  return Math.max(1, Math.min(5, Math.round(base + cohortOffset + variation)));
}

const relationshipNames: Record<string, string> = {
  self: "I am this person (self assessment)",
  manager: "I am their manager",
  direct: "I am a direct report",
  peers: "I am a peer",
  senior: "I am more senior than them but not their manager",
  junior: "I am more junior than them but not a direct report",
};

let sequence = 0;
export const illustrativeResponses: ResponseInput[] = cohorts.flatMap(([cohort, count, offset]) =>
  Array.from({ length: count }, (_, personIndex) => {
    sequence += 1;
    const scores = Object.fromEntries(
      QUESTIONS.map((question, questionIndex) => [
        question.id,
        cohort === "self"
          ? selfScores[questionIndex]
          : boundedScore(baseScores[questionIndex], offset, personIndex, questionIndex),
      ]),
    );
    if (cohort === "senior" && personIndex === 0) scores.Q07 = null;
    if (cohort === "junior" && personIndex === 2) scores.Q13 = null;
    return {
      managerId: illustrativeManager.id,
      responseId: `SYN-${String(sequence).padStart(2, "0")}`,
      relationship: relationshipNames[cohort],
      scores,
    };
  }),
);

const colleagues = illustrativeResponses.filter((row) => !row.relationship.includes("self assessment"));

function addFeedback(index: number, feedback: Partial<ResponseInput>) {
  Object.assign(colleagues[index], feedback);
}

addFeedback(0, {
  questionComments: { Q03: "Creates a clear line of sight between our priorities and the work teams do each week." },
  strengths: "Sets a clear direction and explains why the work matters.",
  development: "Give teams more room to make decisions without waiting for final approval.",
});
addFeedback(1, {
  questionComments: { Q10: "Consistently models calm, fair and respectful leadership, including under pressure." },
  strengths: "Builds trust quickly and treats challenge as useful input.",
  development: "Share updates earlier when plans are changing, even if every detail is not settled.",
});
addFeedback(2, {
  questionComments: { Q15: "Connects people across functions and keeps the client outcome visible." },
  strengths: "Makes cross-team collaboration feel practical rather than procedural.",
  otherFeedback: "The strongest impact comes when strategic context is paired with a clear decision owner.",
});
addFeedback(3, {
  questionComments: { Q04: "Brings energy to difficult priorities and helps the team understand what good looks like." },
  strengths: "Communicates with warmth and conviction.",
  development: "Close decision loops faster when several teams are involved.",
});
addFeedback(4, {
  questionComments: { Q09: "Invites different perspectives and makes it safe to disagree constructively." },
  strengths: "Creates an inclusive environment where people can be direct.",
  development: "Delegate the first draft of more strategic work to build capability below SLG level.",
});
addFeedback(5, {
  questionComments: { Q17: "Accessible and generous with time, particularly when a colleague needs context." },
  strengths: "Approachable across levels and functions.",
  otherFeedback: "Protect some unstructured time for listening outside formal meetings.",
});
addFeedback(6, {
  questionComments: { Q18: "Could simplify the approval path when the risk is already well understood." },
  development: "Remove one approval step from routine commercial decisions.",
});
addFeedback(7, {
  questionComments: { Q05: "Provides reassurance during change and could make the near-term sequence more explicit." },
  strengths: "Stays composed and visible during change.",
  development: "Translate change messages into a clearer sequence of next actions.",
});
addFeedback(8, {
  questionComments: { Q08: "Spots opportunities to strengthen partnerships and follows through personally." },
  strengths: "Understands what matters to clients and partners.",
});
addFeedback(9, {
  questionComments: { Q13: "Trust grows when ownership is explicit; there is still room to hand over more end-to-end work." },
  development: "Define the outcome and guardrails, then let the owner choose the route.",
});
addFeedback(10, {
  questionComments: { Q11: "Makes challenge welcome and listens without becoming defensive." },
  strengths: "Builds an open, respectful working climate.",
});
addFeedback(11, {
  questionComments: { Q16: "Adapts quickly once the direction is clear, but the decision can take time to land." },
  development: "Use shorter decision windows for reversible choices.",
});
addFeedback(12, {
  strengths: "Balances commercial focus with genuine care for people.",
  otherFeedback: "Keep using the leadership team to test messages before wider communication.",
});
addFeedback(13, {
  development: "Make trade-offs more explicit when priorities compete.",
});
addFeedback(14, {
  strengths: "Creates alignment without flattening different viewpoints.",
});
addFeedback(15, {
  development: "Ask for progress evidence at agreed points instead of checking each step.",
});
addFeedback(16, {
  otherFeedback: "A quarterly check-in on delegated decisions would make progress visible.",
});
