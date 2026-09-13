-- Report snapshots are already disclosure-safe. Raw imports remain in the private schema
-- and are available only to server-side import and report-generation jobs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.leadership_360_imports (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  imported_at timestamptz not null default now(),
  imported_by text not null,
  source_checksum text not null unique,
  status text not null check (status in ('imported', 'generated', 'rejected')),
  validation_summary jsonb not null default '{}'::jsonb
);

create table if not exists private.leadership_360_raw_responses (
  import_id uuid not null references private.leadership_360_imports(id) on delete cascade,
  response_id text not null,
  manager_source_id text not null,
  relationship text not null,
  scores jsonb not null,
  question_comments jsonb,
  strengths text,
  development text,
  other_feedback text,
  primary key (import_id, response_id)
);

create table if not exists public.leadership_360_reports (
  id uuid primary key default gen_random_uuid(),
  manager_email text not null check (manager_email = lower(manager_email)),
  manager_name text not null,
  report_payload jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source_import_id uuid references private.leadership_360_imports(id) on delete restrict,
  generated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists leadership_360_one_current_report_per_manager
  on public.leadership_360_reports (manager_email)
  where status = 'published';

alter table public.leadership_360_reports enable row level security;
revoke all on public.leadership_360_reports from anon;
grant select on public.leadership_360_reports to authenticated;

create policy "Managers can view their own published report"
  on public.leadership_360_reports
  for select
  to authenticated
  using (
    status = 'published'
    and lower(coalesce(auth.jwt() ->> 'email', '')) = manager_email
  );
