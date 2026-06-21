-- Gem video clips: store the path to the auto-cut video clip for each gem.
alter table teaching_moments add column if not exists clip_path text;

-- pgvector-backed chunk search scoped to a single video.
-- Used by the gem auto-clip detector to find where in a known video the gem was said.
create or replace function match_chunks_in_video(
  query_embedding vector(1536),
  vid uuid,
  match_count int default 5
)
returns table (
  id uuid,
  video_id uuid,
  start_sec real,
  end_sec real,
  text text,
  similarity float
)
language sql stable as $$
  select c.id, c.video_id, c.start_sec, c.end_sec, c.text,
         1 - (c.embedding <=> query_embedding) as similarity
  from transcript_chunks c
  where c.video_id = vid
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
