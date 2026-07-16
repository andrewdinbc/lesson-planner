-- Teacher Resources -- per-teacher, added by each individual teacher (NOT
-- admin-only, unlike steering_documents which stays Aj's own content).
-- These are websites/resources a teacher personally likes or has bought,
-- surfaced back to them during plan generation alongside the admin
-- steering documents. Two separate systems feeding the same generation
-- step -- do not merge these tables.

create table if not exists teacher_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_teacher_resources_user on teacher_resources (user_id);

alter table teacher_resources enable row level security;
create policy "own resources" on teacher_resources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
