-- Ray AI by TGFX — Supabase Postgres schema
-- Run this in the Supabase SQL editor on a fresh project.

-- ============================================
-- Extensions
-- ============================================
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ============================================
-- Domain: video corpus + trades
-- ============================================
create table if not exists videos (
  id              uuid primary key default gen_random_uuid(),
  filename        text not null unique,
  display_name    text,
  video_date      date,
  date_source     text,
  duration_sec    real,
  source_path     text,
  kind            text not null default 'trading' check (kind in ('trading','teaching')),
  processed_at    timestamptz not null default now()
);

create table if not exists trades (
  id                  uuid primary key default gen_random_uuid(),
  video_id            uuid not null references videos(id) on delete cascade,
  trade_index         int not null,
  -- spoken timing
  entry_time_sec      real,
  exit_time_sec       real,
  -- chart timing (read from TradingView corner via vision)
  entry_chart_time    text,
  exit_chart_time     text,
  -- detection
  entry_phrase        text,
  exit_phrase         text,
  detected_direction  text,
  -- analyzer fields
  instrument          text,
  is_my_instrument    boolean,
  position_visible    boolean,
  direction           text check (direction in ('long','short') or direction is null),
  entry_price         text,
  stop_loss           text,
  take_profit         text,
  position_size       text,
  setup_type          text,
  outcome_raw         text,
  final_outcome       text not null check (final_outcome in ('win','loss','breakeven','not_my_instrument','needs_manual_review','unknown')),
  estimated_rr        text,
  exit_reason         text,
  reasoning           text,
  notes               text,
  -- media paths (Supabase Storage references)
  entry_frame_path    text,
  exit_frame_path     text,
  entry_clip_path     text,
  exit_clip_path      text,
  trade_clip_path     text,
  -- session bucket derived from entry_chart_time + a Ray-configurable mapping
  session_bucket      text,
  -- vector for similarity search ("find trades like this one")
  embedding           vector(1536),
  created_at          timestamptz not null default now(),
  unique (video_id, trade_index)
);

create index if not exists trades_video_idx        on trades(video_id);
create index if not exists trades_final_outcome    on trades(final_outcome);
create index if not exists trades_instrument       on trades(instrument);
create index if not exists trades_setup_type_trgm  on trades using gin (setup_type gin_trgm_ops);
create index if not exists trades_embedding_ivf    on trades using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================
-- Domain: teaching corpus (concepts you explain in videos)
-- ============================================
create table if not exists teaching_moments (
  id              uuid primary key default gen_random_uuid(),
  video_id        uuid not null references videos(id) on delete cascade,
  concept         text not null,
  start_sec       real not null,
  end_sec         real not null,
  quote           text not null,
  frame_path      text,
  embedding       vector(1536),
  created_at      timestamptz not null default now()
);

create index if not exists teaching_concept_trgm   on teaching_moments using gin (concept gin_trgm_ops);
create index if not exists teaching_embedding_ivf  on teaching_moments using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================
-- Domain: raw transcript chunks (for RAG over Ray's own words)
-- ============================================
create table if not exists transcript_chunks (
  id              uuid primary key default gen_random_uuid(),
  video_id        uuid not null references videos(id) on delete cascade,
  start_sec       real not null,
  end_sec         real not null,
  text            text not null,
  embedding       vector(1536),
  created_at      timestamptz not null default now()
);

create index if not exists transcript_video_idx        on transcript_chunks(video_id);
create index if not exists transcript_embedding_ivf    on transcript_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 200);

-- ============================================
-- Domain: users + auth bridge
-- ============================================
-- We piggy-back on Clerk for auth; this table mirrors users so we can JOIN.
create table if not exists app_users (
  id                  uuid primary key default gen_random_uuid(),
  clerk_user_id       text not null unique,
  email               text not null,
  email_verified      boolean not null default false,
  tier                text not null default 'free' check (tier in ('free','trial','paid_standard','live_trade_lab','lifetime')),
  trial_started_at    timestamptz,
  paid_started_at     timestamptz,
  stripe_customer_id  text,
  stripe_subscription_id text,
  current_period_ends_at timestamptz,
  -- abuse controls
  signup_ip           inet,
  signup_country      text,
  created_at          timestamptz not null default now()
);

-- ============================================
-- Domain: credit ledger (per-user, append-only)
-- ============================================
create table if not exists credit_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_users(id) on delete cascade,
  kind            text not null check (kind in ('grant','spend','refund','expire','adjustment')),
  amount          int not null,  -- positive for grants/refunds, negative for spends
  reason          text not null, -- 'free_tier_grant', 'monthly_refresh', 'chat', 'chart_roast', etc
  metadata        jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on credit_ledger(user_id, created_at desc);

-- Feature-specific allotments (separate counters for free/trial tiers)
-- These coexist with the credit ledger — tiers can use either model.
create table if not exists feature_allotments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_users(id) on delete cascade,
  feature         text not null check (feature in ('chat','quiz_question','chart_roast')),
  granted         int not null,
  used            int not null default 0,
  period_kind     text not null check (period_kind in ('one_time','monthly')),
  resets_at       timestamptz,
  unique (user_id, feature, period_kind, resets_at)
);

-- ============================================
-- Domain: chat sessions + messages
-- ============================================
create table if not exists chat_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_users(id) on delete cascade,
  title           text,
  created_at      timestamptz not null default now()
);

create table if not exists chat_messages (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references chat_sessions(id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool')),
  content         text,
  tool_calls      jsonb,   -- structured cards emitted to preview pane
  credits_charged int not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================
-- Domain: quiz attempts + drill tracking
-- ============================================
create table if not exists quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  -- generated content
  kind            text not null check (kind in ('define','identify_setup','predict_outcome','spot_difference','read_level')),
  prompt          text not null,
  choices         jsonb not null,
  correct_index   int not null,
  explanation     text,
  -- anchoring back to corpus
  source_trade_id uuid references trades(id) on delete set null,
  source_teaching_id uuid references teaching_moments(id) on delete set null,
  difficulty      text not null check (difficulty in ('easy','medium','hard')) default 'medium',
  created_at      timestamptz not null default now()
);

create table if not exists quiz_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_users(id) on delete cascade,
  question_id     uuid not null references quiz_questions(id) on delete cascade,
  selected_index  int not null,
  is_correct      boolean not null,
  time_taken_ms   int,
  created_at      timestamptz not null default now()
);

create index if not exists quiz_attempts_user_idx on quiz_attempts(user_id, created_at desc);

-- ============================================
-- Domain: chart roasts (vision feedback)
-- ============================================
create table if not exists chart_roasts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_users(id) on delete cascade,
  image_path      text not null,
  question        text,
  vision_description text,
  retrieved_trade_ids uuid[],
  response        text not null,
  credits_charged int not null default 15,
  created_at      timestamptz not null default now()
);

-- ============================================
-- Helper view: trade summary across the corpus
-- ============================================
create or replace view trade_stats as
  select
    instrument,
    direction,
    final_outcome,
    count(*) as n,
    avg(nullif(regexp_replace(estimated_rr,'[^0-9.]','','g'),'')::numeric) as avg_rr
  from trades
  where final_outcome in ('win','loss','breakeven')
  group by instrument, direction, final_outcome;
-- pgvector retrieval RPCs that the agent calls via supabase.rpc(...)

create or replace function match_trades(
  query_embedding vector(1536),
  match_count int default 5
) returns table (
  id uuid,
  video_id uuid,
  video_date date,
  instrument text,
  direction text,
  final_outcome text,
  setup_type text,
  estimated_rr text,
  reasoning text,
  entry_frame_path text,
  trade_clip_path text,
  similarity float
) language sql stable as $$
  select t.id, t.video_id, v.video_date, t.instrument, t.direction,
         t.final_outcome, t.setup_type, t.estimated_rr, t.reasoning,
         t.entry_frame_path, t.trade_clip_path,
         1 - (t.embedding <=> query_embedding) as similarity
  from trades t
  join videos v on v.id = t.video_id
  where t.embedding is not null
  order by t.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_chunks(
  query_embedding vector(1536),
  match_count int default 8
) returns table (
  id uuid,
  video_id uuid,
  video_date date,
  start_sec real,
  end_sec real,
  text text,
  similarity float
) language sql stable as $$
  select c.id, c.video_id, v.video_date, c.start_sec, c.end_sec, c.text,
         1 - (c.embedding <=> query_embedding) as similarity
  from transcript_chunks c
  join videos v on v.id = c.video_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_teaching(
  query_embedding vector(1536),
  match_count int default 5
) returns table (
  id uuid,
  video_id uuid,
  video_date date,
  concept text,
  quote text,
  frame_path text,
  start_sec real,
  similarity float
) language sql stable as $$
  select tm.id, tm.video_id, v.video_date, tm.concept, tm.quote,
         tm.frame_path, tm.start_sec,
         1 - (tm.embedding <=> query_embedding) as similarity
  from teaching_moments tm
  join videos v on v.id = tm.video_id
  where tm.embedding is not null
  order by tm.embedding <=> query_embedding
  limit match_count;
$$;
