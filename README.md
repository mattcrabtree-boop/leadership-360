# Leadership 360 mini-site prototype

This local prototype turns a synthetic Leadership 360 response set into one disclosure-safe manager report. It follows the selected report hierarchy while using responsive web sections instead of reproducing the PDF page by page.

## Run locally

Use Node 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Run `npm test` for the privacy/data checks and production render check.

## Reusable build shape

- `lib/leadership360.ts` owns aggregation, protected-group pooling, disclosure fallbacks, visible-group range calculation, comment redaction and stable per-report shuffling. A displayed range is the lowest to highest average across only the groups that can be shown without identifying a small group.
- `data/illustrative.ts` is the only synthetic raw-response fixture used by the prototype.
- `app/page.tsx` receives a disclosure-safe report object. It does not receive respondent IDs or relationship labels with comments.
- `buildSeparatedReports()` prepares one isolated object per manager instead of placing all managers in one client-readable bundle.

## Introducing the real workbook safely

1. Keep the workbook off the public site and validate the `Managers`, `Responses` and `Question map` columns on a restricted machine.
2. Map each response row to the `ResponseInput` shape, then run `buildSeparatedReports()` before any frontend build.
3. Review redactions and repeated-theme summaries. Names, unique events and contextual clues need human review; shuffling alone does not anonymise prose.
4. Write each safe manager object to a separate build or an access-controlled server boundary. Do not ship a shared bundle or discoverable manager index.
5. Re-run the automated privacy tests, add fixture-specific disclosure checks, and agree authentication, retention, deletion and audit handling before processing live responses.

The action-plan fields are intentionally browser-only and are never persisted.

## Production access model

The live-site foundation uses Supabase email magic links. A manager authenticates with their invited email address, then database row-level security permits access only to that manager's published disclosure-safe report snapshot. Raw response imports belong in the private schema and are not available through the browser API. Copy `.env.example` to `.env.local` for local configuration; never commit service-role keys or source workbooks.

## Preparing a live survey export

Keep the source workbook and generated files in the ignored `work/` folder. The preparation step maps the approved survey export's 16 rating questions and comments into isolated report payloads:

```sh
python3 scripts/prepare_leadership_360_import.py /path/to/export.xlsx work/leadership-360-import.json
node --experimental-strip-types scripts/build-leadership-360-reports.ts work/leadership-360-import.json work/leadership-360-report-payloads.json
```

Reports require at least three colleague responses. Direct-report, peer, senior and junior groups below three are pooled before display; written feedback is withheld below the same threshold. Manager feedback remains a distinct, expected perspective. The generated readiness list identifies any reports that should be held for follow-up before access is provisioned.

## Publishing ready reports

After setting up Supabase Auth and custom SMTP, add `SUPABASE_SERVICE_ROLE_KEY` to the ignored root `.env.local` file. The publisher is safe by default: it validates files only and makes no network calls. Use `--publish` to provision access and publish ready reports without email; add `--send-links` only after approving the final recipient list.

```sh
npm run reports:publish
npm run reports:publish -- --publish
npm run reports:publish -- --publish --send-links
```
