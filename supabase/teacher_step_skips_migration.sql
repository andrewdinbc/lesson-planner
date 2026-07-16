-- Generic per-user step-skip tracking -- reusable for any dashboard
-- onboarding step, not just inventories (which already has its own
-- skipped column). Avoids bolting an ad-hoc "skipped" column onto every
-- domain table (unit_priorities, teacher_class_setup, etc.) going forward.
create table if not exists teacher_step_skips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  step_key text not null,
  skipped_at timestamptz not null default now(),
  unique(user_id, step_key)
);

alter table teacher_step_skips enable row level security;
create policy "own step skips" on teacher_step_skips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
