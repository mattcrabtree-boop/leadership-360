"use client";

import { useEffect, useState } from "react";
import { ReportExperience, type ExperienceReport } from "@/app/ReportExperience";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ReportGate({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ExperienceReport | null>(null);
  const [message, setMessage] = useState("Loading your private report…");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error || !data.session) {
        window.location.replace(`/sign-in?next=${encodeURIComponent(`/report/${reportId}`)}`);
        return;
      }
      const { data: rows, error: reportError } = await supabase
        .from("leadership_360_reports")
        .select("report_payload")
        .eq("id", reportId)
        .eq("status", "published")
        .maybeSingle();
      if (reportError || !rows?.report_payload) {
          setMessage("This report is unavailable. Please check your invitation link or contact the report administrator.");
          return;
      }
      setReport(rows.report_payload as ExperienceReport);
    }).catch(() => setMessage("This report is unavailable. Please request a new sign-in link or contact the report administrator."));
  }, [reportId]);

  if (report) return <><button className="report-sign-out" type="button" onClick={() => { getSupabaseBrowserClient().auth.signOut().finally(() => window.location.replace("/sign-in")); }}>Sign out</button><ReportExperience report={report} /></>;
  return <main className="auth-page"><section className="auth-card"><p>{message}</p></section></main>;
}
