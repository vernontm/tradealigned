-- LMS — courses + lessons + per-user lesson progress.
-- All course media is served from a private Supabase Storage bucket via signed URLs.

create table if not exists courses (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  title               text not null,
  description         text,
  cover_image_url     text,
  position            int  not null default 0,
  total_lessons       int  not null default 0,
  total_duration_sec  real not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists courses_position_idx on courses(position);

create table if not exists course_lessons (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references courses(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  position        int  not null default 0,
  duration_sec    real,
  storage_path    text not null,    -- path inside the 'course-videos' bucket
  source_s3_key   text,             -- original S3 key for traceability
  created_at      timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists course_lessons_course_idx on course_lessons(course_id, position);

create table if not exists lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_id       uuid not null references course_lessons(id) on delete cascade,
  position_sec    real not null default 0,
  completed       boolean not null default false,
  completed_at    timestamptz,
  last_seen_at    timestamptz not null default now(),
  unique (auth_user_id, lesson_id)
);

create index if not exists lesson_progress_user_idx on lesson_progress(auth_user_id);
create index if not exists lesson_progress_lesson_idx on lesson_progress(lesson_id);

-- RLS: students own their own progress; courses + lessons readable by anyone signed in.
alter table courses          enable row level security;
alter table course_lessons   enable row level security;
alter table lesson_progress  enable row level security;

drop policy if exists "auth read courses" on courses;
create policy "auth read courses" on courses
  for select using (auth.role() = 'authenticated');

drop policy if exists "auth read lessons" on course_lessons;
create policy "auth read lessons" on course_lessons
  for select using (auth.role() = 'authenticated');

drop policy if exists "users read own progress" on lesson_progress;
create policy "users read own progress" on lesson_progress
  for select using (auth.uid() = auth_user_id);

drop policy if exists "users write own progress" on lesson_progress;
create policy "users write own progress" on lesson_progress
  for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- Private Storage bucket for the course videos. Signed URLs are how we serve them.
insert into storage.buckets (id, name, public)
values ('course-videos', 'course-videos', false)
on conflict (id) do nothing;

-- View: enriched course summary with per-user progress for the admin / list pages
create or replace view public.course_summary as
select
  c.id,
  c.slug,
  c.title,
  c.description,
  c.cover_image_url,
  c.position,
  c.total_lessons,
  c.total_duration_sec
from public.courses c
order by c.position;
