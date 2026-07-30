-- ═══════════════════════════════════════════════════════════════════
-- Per-period (term / semester) tag for attendance opening balances
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- Report cards and the Reports → Attendance tab filter attendance by term
-- (see add_attendance_period.sql). Opening balances (pre-SRMS day counts)
-- had no term, so after per-period attendance shipped they stopped showing
-- on individual report cards. This adds the term tag; the opening-balance
-- form now requires one, and the report card shows a balance on the card
-- for the term it's tagged to.
--
-- BACKFILL
-- The only live client, Saviour Academy, is in Term 3, so existing
-- (untagged) balances are set to 'Term 3'. One-time backfill of current data.
-- Future clients pick the term in the form before saving, so their rows are
-- never null and the `where period is null` guard can't touch them on re-run.
-- ═══════════════════════════════════════════════════════════════════

alter table public.attendance_opening_balances add column if not exists period text;

-- One-time backfill of existing (untagged) balances to the current term.
update public.attendance_opening_balances set period = 'Term 3' where period is null;
