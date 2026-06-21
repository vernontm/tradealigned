-- Gems = teaching moments that aren't necessarily trades.
alter table teaching_moments add column if not exists title text;
alter table teaching_moments alter column video_id drop not null;
alter table teaching_moments add column if not exists pinned_from_trade_id uuid references trades(id) on delete set null;
create index if not exists teaching_moments_pinned_trade_idx on teaching_moments(pinned_from_trade_id);
