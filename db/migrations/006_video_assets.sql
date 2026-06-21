-- Video assets for the Education library:
--   thumb_url     : path within course-videos bucket to a JPEG thumbnail
--   storage_path  : path within course-videos bucket to the streamable MP4
--                   (when null, lesson player falls back to S3 source)
alter table videos add column if not exists thumb_url     text;
alter table videos add column if not exists storage_path  text;
