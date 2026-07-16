-- Stores a teacher's previously-uploaded plan (PDF) so experienced
-- teachers with an existing plan can have AI adapt/modify it into the
-- new system's structure instead of starting from a blank page.
create table if not exists previous_plan_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  extracted_text text not null,
  uploaded_at timestamptz not null default now()
);

alter table previous_plan_uploads enable row level security;
create policy "own previous plan uploads" on previous_plan_uploads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
