import { ReportGate } from "./ReportGate";

export default async function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <ReportGate reportId={reportId} />;
}
