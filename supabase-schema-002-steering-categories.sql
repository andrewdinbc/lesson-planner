-- Adds category taxonomy + book/resource metadata to steering_documents,
-- so full uploaded books (100+ pages) can be organized into Aj's three
-- categories and applied purposefully during generation rather than as one
-- undifferentiated pile of "background text."

alter table steering_documents
  add column if not exists category text not null default 'actionable_resources'
    check (category in ('philosophy_of_education', 'psychology_of_education', 'actionable_resources'));

alter table steering_documents
  add column if not exists author text;

alter table steering_documents
  add column if not exists num_pages integer;

alter table steering_documents
  add column if not exists char_count integer;

create index if not exists idx_steering_category on steering_documents (category);
