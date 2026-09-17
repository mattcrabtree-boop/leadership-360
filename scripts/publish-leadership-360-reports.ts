import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type ReadinessItem = {
  managerId: string;
  managerName: string;
  responseStatus: "ready" | "hold";
};

type ReportPayload = {
  manager: { id: string; name: string };
  reportType: "live" | "illustrative";
};

type PreparedReports = {
  readiness: ReadinessItem[];
  reports: Record<string, ReportPayload>;
};

type Recipient = {
  managerId: string;
  managerName: string;
  email: string;
};

type RecipientFile = { recipients: Recipient[] };
type PublishedLink = { managerId: string; managerName: string; email: string; reportId: string };

const root = resolve(import.meta.dirname, "..");
const reportsPath = resolve(root, "work/leadership-360-report-payloads.json");
const recipientsPath = resolve(root, "work/leadership-360-recipients.json");
const manifestPath = resolve(root, "work/leadership-360-published-links.json");
const args = new Set(process.argv.slice(2));
const publish = args.has("--publish");
const sendLinks = args.has("--send-links");

if (sendLinks && !publish) {
  throw new Error("--send-links must be used with --publish, so every link has a published report.");
}
if ([...args].some((arg) => !["--publish", "--send-links"].includes(arg))) {
  throw new Error("Usage: node --experimental-strip-types scripts/publish-leadership-360-reports.ts [--publish] [--send-links]");
}

function loadLocalEnvironment(text: string) {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function getEnvironment() {
  try {
    loadLocalEnvironment(await readFile(resolve(root, ".env.local"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.LEADERSHIP_360_SITE_URL || "https://leadership-360.netlify.app";
  if (!url || !serviceRoleKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.local file before publishing.");
  }
  return { url, serviceRoleKey, siteUrl: siteUrl.replace(/\/$/, "") };
}

function validate(reports: PreparedReports, recipients: RecipientFile) {
  const ready = reports.readiness.filter((item) => item.responseStatus === "ready");
  const held = reports.readiness.filter((item) => item.responseStatus === "hold");
  const recipientsByManager = new Map(recipients.recipients.map((item) => [item.managerId, item]));
  const emails = new Set<string>();
  for (const recipient of recipients.recipients) {
    if (recipient.email !== recipient.email.toLowerCase() || !recipient.email.includes("@")) {
      throw new Error(`Invalid recipient email for ${recipient.managerName}.`);
    }
    if (emails.has(recipient.email)) throw new Error(`Duplicate recipient email: ${recipient.email}`);
    emails.add(recipient.email);
  }
  const publishable = ready.map((item) => {
    const recipient = recipientsByManager.get(item.managerId);
    const payload = reports.reports[item.managerId];
    if (!recipient) throw new Error(`No recipient email for ready report: ${item.managerName}`);
    if (!payload || payload.reportType !== "live") throw new Error(`Missing live payload for ${item.managerName}`);
    return { readiness: item, recipient, payload };
  });
  return { publishable, held };
}

const reports = JSON.parse(await readFile(reportsPath, "utf8")) as PreparedReports;
const recipients = JSON.parse(await readFile(recipientsPath, "utf8")) as RecipientFile;
const { publishable, held } = validate(reports, recipients);

if (!publish) {
  console.log(`Dry run only: ${publishable.length} reports are ready to publish; ${held.length} remain held. No network calls or emails were made.`);
  process.exit(0);
}

const { url, serviceRoleKey, siteUrl } = await getEnvironment();
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existingUsers, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw usersError;
const knownEmails = new Set(existingUsers.users.map((user) => user.email?.toLowerCase()).filter(Boolean));

for (const { recipient } of publishable) {
  if (knownEmails.has(recipient.email)) continue;
  const { error } = await supabase.auth.admin.createUser({ email: recipient.email, email_confirm: true });
  if (error) throw new Error(`Could not provision ${recipient.managerName}: ${error.message}`);
  knownEmails.add(recipient.email);
}

const emails = publishable.map(({ recipient }) => recipient.email);
const { data: existingReports, error: reportsError } = await supabase
  .from("leadership_360_reports")
  .select("id, manager_email")
  .in("manager_email", emails);
if (reportsError) throw reportsError;

const reportIdsByEmail = new Map((existingReports ?? []).map((report) => [report.manager_email, report.id]));
const published: PublishedLink[] = [];

for (const { readiness, recipient, payload } of publishable) {
  const values = {
    manager_email: recipient.email,
    manager_name: readiness.managerName,
    report_payload: payload,
    status: "published",
    published_at: new Date().toISOString(),
  };
  const existingId = reportIdsByEmail.get(recipient.email);
  const result = existingId
    ? await supabase.from("leadership_360_reports").update(values).eq("id", existingId).select("id").single()
    : await supabase.from("leadership_360_reports").insert(values).select("id").single();
  if (result.error || !result.data) throw new Error(`Could not publish ${recipient.managerName}: ${result.error?.message ?? "no report ID returned"}`);
  published.push({ managerId: readiness.managerId, managerName: readiness.managerName, email: recipient.email, reportId: result.data.id });
}

await writeFile(manifestPath, JSON.stringify({ siteUrl, published }, null, 2));

if (sendLinks) {
  for (const item of published) {
    const callback = `${siteUrl}/auth/callback?next=${encodeURIComponent(`/report/${item.reportId}`)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: item.email,
      options: { shouldCreateUser: false, emailRedirectTo: callback },
    });
    if (error) throw new Error(`Could not send a link to ${item.managerName}: ${error.message}`);
  }
  console.log(`Published ${published.length} reports and sent ${published.length} magic links. ${held.length} reports remain held.`);
} else {
  console.log(`Published ${published.length} reports and provisioned access. No emails were sent. ${held.length} reports remain held.`);
}
