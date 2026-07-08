-- Lesson Planner (Curriculum Designer)
-- Supabase project: vjimsmfybvyfhegsplwm (shared with TeacherAssist / Parent Portal)
-- Per-user, hierarchical plans: year -> month -> week -> day -> lesson.
-- "Steering documents" (full source texts) are fed into generation prompts
-- as background context, per Aj's explicit requirement.

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references plans(id) on delete cascade,
  type text not null check (type in ('year', 'month', 'week', 'day', 'lesson')),
  title text not null,
  subject text,
  grade text,
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists steering_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  full_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_plans_user on plans (user_id);
create index if not exists idx_plans_parent on plans (parent_id);
create index if not exists idx_steering_user on steering_documents (user_id);

-- Row Level Security: every user only ever sees their own plans/documents.
alter table plans enable row level security;
alter table steering_documents enable row level security;

create policy "Users manage their own plans" on plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own steering documents" on steering_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
