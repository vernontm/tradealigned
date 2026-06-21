-- Curation columns so Ray can override / hide trades during the demo phase.
alter table trades add column if not exists manual_outcome text
  check (manual_outcome in ('win','loss','breakeven','not_my_instrument','needs_manual_review','unknown') or manual_outcome is null);
alter table trades add column if not exists hidden boolean not null default false;

create index if not exists trades_hidden_idx on trades(hidden);
