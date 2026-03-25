-- ============================================================
-- গণিত শিক্ষা — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

create table if not exists chapters (
  id          text primary key,
  class_id    integer not null,
  name        text    not null,
  description text    not null default ''
);

create table if not exists topics (
  id          text primary key,
  chapter_id  text    not null references chapters(id) on delete cascade,
  name        text    not null,
  description text    not null default ''
);

create table if not exists questions (
  id          text    primary key,
  topic_id    text    not null references topics(id) on delete cascade,
  type        text    not null check (type in ('mcq', 'short')),
  text        text    not null,
  options     jsonb,                          -- array of strings, null for short-answer
  answer      text    not null,               -- option index as text for MCQ, answer string for short
  solution    text    not null,
  difficulty  text    not null check (difficulty in ('easy', 'medium', 'hard'))
);

-- Indexes for common query patterns
create index if not exists idx_chapters_class_id  on chapters(class_id);
create index if not exists idx_topics_chapter_id  on topics(chapter_id);
create index if not exists idx_questions_topic_id on questions(topic_id);
create index if not exists idx_questions_diff     on questions(difficulty);

-- Enable Row Level Security (read-only public access for the app)
alter table chapters  enable row level security;
alter table topics    enable row level security;
alter table questions enable row level security;

-- Allow anyone (anon key) to SELECT — questions are not sensitive
create policy "Public read chapters"   on chapters  for select using (true);
create policy "Public read topics"     on topics    for select using (true);
create policy "Public read questions"  on questions for select using (true);
