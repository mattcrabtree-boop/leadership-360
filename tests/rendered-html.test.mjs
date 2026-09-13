import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete illustrative manager report", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Leadership 360 Feedback · Illustrative report<\/title>/i);
  assert.match(html, /Alex Morgan/);
  assert.match(html, /Five-theme profile/);
  assert.match(html, /Combined colleague group/);
  assert.match(html, /View exact question-by-group scores/);
  assert.match(html, /Turn one insight into visible change/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|SYN-\d|responseId|M01/);
});

test("keeps privacy, accessibility, and print behavior in the product surface", async () => {
  const [page, experience, css, layout, packageJson, supabaseClient, migration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ReportExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase-browser.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202609130001_leadership_360_reports.sql", import.meta.url), "utf8"),
  ]);
  const productSurface = `${page}\n${experience}`;
  assert.match(productSurface, /Skip to report/);
  assert.match(productSurface, /role="img" aria-label=/);
  assert.match(experience, /aria-controls=\{`\$\{idBase\}-\$\{item\.id\}-panel`\}/);
  assert.match(experience, /onKeyDown=\{\(event\) => onKeyDown\(event, index\)\}/);
  assert.match(productSurface, /<details className="exact-detail">/);
  assert.match(productSurface, /Understanding your scores and this report/);
  assert.match(productSurface, /The average of all valid colleague ratings/);
  assert.match(productSurface, /does not persist anything you type/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media print/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(layout, /index: false, follow: false/);
  assert.match(supabaseClient, /shouldCreateUser: false/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /Managers can view their own published report/);
  assert.doesNotMatch(migration, /grant .* to anon/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
