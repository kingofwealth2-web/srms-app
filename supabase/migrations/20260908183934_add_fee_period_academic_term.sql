-- A recurring fee period's label is a billing-run label (for example,
-- "8th sep"), not the school's academic term. Keep the two concepts separate
-- so term-filtered KPIs can include recurring fees without losing that label.
alter table public.fee_periods
  add column if not exists academic_period text;
