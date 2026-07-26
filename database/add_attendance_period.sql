-- ═══════════════════════════════════════════════════════════════════
-- Per-period (term / semester) scoping for attendance
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- Grades and fees are stored per period; attendance was stored only per
-- academic year, so a term report card could only ever show whole-year
-- attendance -- identical on every term's card. This stamps each daily
-- attendance record with the term/semester it was marked in, so cards and
-- the Reports → Attendance tab can show attendance for the selected period.
--
-- BACKFILL
-- Existing rows predate the column. The only live client, Saviour Academy, is
-- currently in Term 3, so existing rows are set to 'Term 3'. This is a one-time
-- backfill of the data that exists right now.
--
-- Future clients are unaffected: they onboard after this runs, and every record
-- they create is stamped with its term at marking time (never null), so the
-- `where period is null` guard below can never touch their data, even on re-run.
-- ═══════════════════════════════════════════════════════════════════

alter table public.attendance add column if not exists period text;

-- One-time backfill of existing (period-less) rows to the current term.
update public.attendance set period = 'Term 3' where period is null;
