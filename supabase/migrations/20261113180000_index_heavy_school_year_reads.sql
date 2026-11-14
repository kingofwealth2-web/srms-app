-- supabase migration disable-transaction
-- Support keyset paging for the large school-year tables.  The previous
-- attendance loader used OFFSET pagination; every later page repeated work over
-- earlier rows, and production logs showed the attendance request at offset
-- 4000 being terminated by PostgREST's timeout manager.
--
-- Put the unique cursor last so equality filters on school/year and the ordered
-- primary-key cursor can be served by one index.  The old two-column indexes
-- become redundant prefixes after these are created.
alter table public.attendance_opening_balances
  add column if not exists period text;

create index concurrently if not exists idx_attendance_school_year_id
  on public.attendance (school_id, academic_year, id);

-- The attendance screen reads a single class/day and pages history by date/id.
create index concurrently if not exists idx_attendance_school_year_class_date_id
  on public.attendance (school_id, academic_year, class_id, date desc, id desc);

create index concurrently if not exists idx_attendance_school_year_date_id
  on public.attendance (school_id, academic_year, date desc, id desc);

-- The report RPC groups by student/class and filters by period/status.
create index concurrently if not exists idx_attendance_school_year_student_class
  on public.attendance (school_id, academic_year, student_id, class_id)
  include (period, status);

create index concurrently if not exists idx_opening_balances_school_year_student
  on public.attendance_opening_balances (school_id, academic_year, student_id, class_id);

create index concurrently if not exists idx_fees_school_year_id
  on public.fees (school_id, academic_year, id);

create index concurrently if not exists idx_fees_school_period
  on public.fees (school_id, fee_period_id);

create index concurrently if not exists idx_payments_school_year_id
  on public.payments (school_id, academic_year, id);

-- The fee summary and receipt workflows look up transactions by fee.
create index concurrently if not exists idx_payments_school_fee
  on public.payments (school_id, fee_id)
  include (amount);

drop index concurrently if exists public.idx_attendance_school;
drop index concurrently if exists public.idx_fees_school_year;
drop index concurrently if exists public.idx_payments_school;
