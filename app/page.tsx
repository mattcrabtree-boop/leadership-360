import { illustrativeManager, illustrativeResponses } from "@/data/illustrative";
import { buildManagerReport } from "@/lib/leadership360";
import { ReportExperience, type ExperienceReport } from "./ReportExperience";

export default function Home() {
  const report = buildManagerReport(illustrativeManager, illustrativeResponses);
  const manager = {
    name: report.manager.name,
    jobTitle: report.manager.jobTitle,
    reportPeriod: report.manager.reportPeriod,
    expectedResponses: report.manager.expectedResponses,
  };
  const safeReport: ExperienceReport = { ...report, manager };

  return <ReportExperience report={safeReport} />;
}
