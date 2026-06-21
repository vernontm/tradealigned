-- Two new accuracy-driven outcomes:
--   open_runner          = Ray was still in the trade when the session ended
--   spoken_chart_mismatch = the spoken instrument doesn't match what's on Ray's chart
--                          (typically a co-host calling a trade on a different pair
--                           while Ray's screen still shows EURUSD etc.)
alter table trades drop constraint if exists trades_final_outcome_check;
alter table trades add constraint trades_final_outcome_check
  check (final_outcome in (
    'win','loss','breakeven','open_runner',
    'not_my_instrument','spoken_chart_mismatch',
    'needs_manual_review','unknown'
  ));
