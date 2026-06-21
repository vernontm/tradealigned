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
