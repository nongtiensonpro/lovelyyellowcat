-- ui_events: Web Vitals + island error (Phase 8, ADR-0004)
-- Insert-only cho mọi người (anon), đọc chỉ admin. Không PII: path không query, sid hash session.

create table if not exists public.ui_events (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  value bigint not null,
  path text not null default '',
  sid text not null default '',
  fx text not null default '',
  ua text not null default '',
  created_at timestamptz not null default now()
);

alter table public.ui_events enable row level security;

drop policy if exists "anon can insert telemetry" on public.ui_events;
create policy "anon can insert telemetry"
  on public.ui_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admin read telemetry" on public.ui_events;
create policy "admin read telemetry"
  on public.ui_events for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

create index if not exists ui_events_metric_created_idx
  on public.ui_events (metric, created_at desc);
