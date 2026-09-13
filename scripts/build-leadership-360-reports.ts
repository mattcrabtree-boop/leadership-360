import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildSeparatedReports,
  PRIVACY_CONFIG,
  type ManagerInput,
  type ResponseInput,
} from "../lib/leadership360.ts";

type PreparedImport = {
  sourceFilename: string;
  sourceChecksum: string;
  managers: ManagerInput[];
  responses: ResponseInput[];
};

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: node --experimental-strip-types scripts/build-leadership-360-reports.ts <prepared-import.json> <report-payloads.json>");
}

const prepared = JSON.parse(await readFile(resolve(inputPath), "utf8")) as PreparedImport;
const reports = buildSeparatedReports(prepared.managers, prepared.responses, {
  privacy: PRIVACY_CONFIG,
  redactionTerms: prepared.managers.map((manager) => manager.name),
  reportType: "live",
  generatedFrom: "validated Leadership 360 survey export",
});

const readiness = Object.entries(reports).map(([managerId, report]) => ({
  managerId,
  managerName: report.manager.name,
  colleagueResponses: report.responseSummary.colleagues,
  responseStatus: report.overview.allColleagues.status === "shown" ? "ready" : "hold",
  colleagueGroupDetail: report.overview.cohortDetailStatus,
  writtenFeedback: report.comments.status,
})).sort((a, b) => a.responseStatus.localeCompare(b.responseStatus) || a.managerName.localeCompare(b.managerName));

const output = {
  sourceFilename: prepared.sourceFilename,
  sourceChecksum: prepared.sourceChecksum,
  privacyPolicy: {
    minAnonymousGroupSize: PRIVACY_CONFIG.minProtectedCohortSize,
    protectedGroups: PRIVACY_CONFIG.protectedCohorts,
    managerFeedback: "shown separately",
    writtenFeedback: "withheld below three colleague responses",
  },
  readiness,
  reports,
};

await writeFile(resolve(outputPath), JSON.stringify(output), "utf8");
console.log(`Prepared ${readiness.filter((item) => item.responseStatus === "ready").length} report payloads; ${readiness.filter((item) => item.responseStatus === "hold").length} held for follow-up.`);
