-- Class Setup -- grades and subjects a teacher teaches. Collected early
-- in onboarding (before Year Plan) since Year Plan's curriculum lens
-- suggestions and generation quality depend on knowing this context.
-- Run once in Supabase SQL Editor.

create table if not exists teacher_class_setup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  grades text[] not null default '{}',
  subjects text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table teacher_class_setup enable row level security;
create policy "own class setup" on teacher_class_setup
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
