import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSafeScope,
  buildSeparatedReports,
  stableCommentShuffle,
} from "../lib/leadership360.ts";

function response(managerId, responseId, relationship, scores, extra = {}) {
  return { managerId, responseId, relationship, scores, ...extra };
}

test("All Colleagues excludes Self, weights valid ratings, and ignores missing answers", () => {
  const result = buildSafeScope([
    response("M01", "self", "self", { Q03: 5, Q04: 5 }),
    response("M01", "mgr", "manager", { Q03: 5, Q04: null }),
    response("M01", "p1", "peers", { Q03: 1, Q04: 1 }),
    response("M01", "p2", "peers", { Q03: 1, Q04: 1 }),
  ], ["Q03", "Q04"]);

  assert.equal(result.self.score, 5);
  assert.equal(result.allColleagues.score, 1.8);
  assert.equal(result.allColleagues.respondents, 3);
  assert.equal(result.allColleagues.ratings, 5);
});

test("a singleton protected cohort is absorbed into a safe combined group", () => {
  const result = buildSafeScope([
    response("M01", "d1", "direct", { Q03: 5 }),
    response("M01", "p1", "peers", { Q03: 3 }),
    response("M01", "p2", "peers", { Q03: 4 }),
    response("M01", "m1", "manager", { Q03: 4 }),
  ], ["Q03"]);

  assert.equal(result.cohortDetailStatus, "shown");
  assert.equal(result.cohorts.some((cohort) => cohort.key === "direct"), false);
  assert.equal(result.cohorts.some((cohort) => cohort.key === "peers"), false);
  const combined = result.cohorts.find((cohort) => cohort.key === "combined");
  assert.equal(combined?.respondents, 3);
  assert.equal(combined?.score, 4);
});

test("two protected singletons pool together without leaking either component", () => {
  const result = buildSafeScope([
    response("M01", "d1", "direct", { Q03: 5 }),
    response("M01", "p1", "peers", { Q03: 3 }),
    response("M01", "s1", "senior", { Q03: 4 }),
  ], ["Q03"]);
  assert.deepEqual(result.cohorts.map((cohort) => cohort.key), ["senior", "combined"]);
  assert.equal(result.cohorts.find((cohort) => cohort.key === "combined")?.score, 4);
  assert.deepEqual(result.range, { low: 4, high: 4 });
});

test("an unpoolable singleton withholds component detail and prevents subtraction", () => {
  const result = buildSafeScope([
    response("M01", "d1", "direct", { Q03: 5 }),
    response("M01", "m1", "manager", { Q03: 3 }),
    response("M01", "m2", "manager", { Q03: 4 }),
  ], ["Q03"]);
  assert.equal(result.allColleagues.status, "shown");
  assert.equal(result.cohortDetailStatus, "withheld");
  assert.deepEqual(result.cohorts, []);
  assert.equal(result.range, null);
  assert.doesNotMatch(JSON.stringify(result), /"key":"direct"|"respondents":1/);
});

test("comment shuffling is stable per report, different between reports, and strips identifiers", () => {
  const comments = [
    { respondentId: "R1", text: "Alpha" },
    { respondentId: "R2", text: "Bravo" },
    { respondentId: "R3", text: "Charlie" },
    { respondentId: "R4", text: "Delta" },
    { respondentId: "R5", text: "Echo" },
  ];
  const first = stableCommentShuffle(comments, "M01|strengths");
  const repeated = stableCommentShuffle(comments, "M01|strengths");
  const otherReport = stableCommentShuffle(comments, "M02|strengths");
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, otherReport);
  assert.equal(first.some((comment) => /R[1-5]/.test(comment)), false);
});

test("separated reports contain only their manager's scores and comments", () => {
  const managers = [
    { id: "M01", name: "One", jobTitle: "Role", reportPeriod: "May" },
    { id: "M02", name: "Two", jobTitle: "Role", reportPeriod: "May" },
  ];
  const reports = buildSeparatedReports(managers, [
    response("M01", "R1", "manager", { Q03: 5 }, { strengths: "M01_ONLY_SENTINEL" }),
    response("M01", "R2", "senior", { Q03: 4 }),
    response("M02", "R3", "manager", { Q03: 2 }, { strengths: "M02_ONLY_SENTINEL" }),
    response("M02", "R4", "senior", { Q03: 3 }),
  ]);
  const first = JSON.stringify(reports.M01);
  const second = JSON.stringify(reports.M02);
  assert.match(first, /M01_ONLY_SENTINEL/);
  assert.doesNotMatch(first, /M02_ONLY_SENTINEL|"responseId"|"relationship"/);
  assert.match(second, /M02_ONLY_SENTINEL/);
  assert.doesNotMatch(second, /M01_ONLY_SENTINEL|"responseId"|"relationship"/);
});
