-- One-off production data repair for Bibiani Saviour Academy Prep./JHS.
--
-- The school was configured as 2026/2027 while its May-July 2026 records were
-- entered, so all historical rows were stamped with the new year. The verified
-- activity gap is 2026-07-30 through 2026-09-07; the new term began on
-- 2026-09-08. This transaction restores records before that boundary to
-- 2025/2026 while preserving new-term activity.

begin;

set local srms.year_rollover = 'on';

do $$
declare
  v_school_name text;
  v_current_year text;
  v_old_fee_rows bigint;
begin
  select school_name, replace(academic_year, '-', '/')
    into v_school_name, v_current_year
  from public.settings
  where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid;

  if v_school_name <> 'BIBIANI SAVIOUR ACADEMY PREP./JHS' then
    raise exception 'School identity check failed: %', v_school_name;
  end if;
  if v_current_year <> '2026/2027' then
    raise exception 'Current-year check failed: %', v_current_year;
  end if;
  if exists (
    select 1 from public.fees
    where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
      and academic_year = '2025/2026'
  ) then
    raise exception 'Repair aborted: 2025/2026 fee rows already exist';
  end if;

  select count(*) into v_old_fee_rows
  from public.fees
  where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
    and academic_year = '2026/2027'
    and created_at < timestamptz '2026-09-08 00:00:00+00';

  if v_old_fee_rows < 9000 then
    raise exception 'Repair candidate check failed: only % pre-term fee rows', v_old_fee_rows;
  end if;
end $$;

-- Keep today's template rows as the live 2026/2027 templates. Create matching
-- 2025/2026 copies for every template used by a historical recurring period.
create temporary table bibiani_template_map (
  old_id uuid primary key,
  historical_id uuid not null default gen_random_uuid()
) on commit drop;

insert into bibiani_template_map (old_id)
select distinct fp.template_id
from public.fee_periods fp
where fp.school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and fp.period_date < date '2026-09-08';

insert into public.fee_templates
  (id, school_id, name, amount_per_period, academic_year, created_by, created_at, class_ids)
select
  m.historical_id, t.school_id, t.name, t.amount_per_period,
  '2025/2026', t.created_by, t.created_at, t.class_ids
from bibiani_template_map m
join public.fee_templates t on t.id = m.old_id;

-- Repoint historical recurring rows to the historical template copies before
-- changing their year labels. New-term rows continue to use the live templates.
update public.fees f
set template_id = m.historical_id
from bibiani_template_map m
where f.school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and f.template_id = m.old_id
  and f.created_at < timestamptz '2026-09-08 00:00:00+00';

update public.fee_periods fp
set template_id = m.historical_id,
    academic_year = '2025/2026'
from bibiani_template_map m
where fp.school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and fp.template_id = m.old_id
  and fp.period_date < date '2026-09-08';

update public.fees
set academic_year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and academic_year = '2026/2027'
  and created_at < timestamptz '2026-09-08 00:00:00+00';

-- A payment belongs to the same academic ledger as its fee, including a later
-- payment made against an older balance.
update public.payments p
set academic_year = f.academic_year
from public.fees f
where p.school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and p.fee_id = f.id
  and p.academic_year is distinct from f.academic_year;

update public.grades
set year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and year = '2026/2027'
  and created_at < timestamptz '2026-09-08 00:00:00+00';

update public.attendance
set academic_year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and academic_year = '2026/2027'
  and date < date '2026-09-08';

update public.behaviour
set academic_year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and academic_year = '2026/2027'
  and coalesce(date, created_at::date) < date '2026-09-08';

update public.announcements
set academic_year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and academic_year = '2026/2027'
  and created_at < timestamptz '2026-09-08 00:00:00+00';

update public.report_remarks
set year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and year = '2026/2027'
  and updated_at < timestamptz '2026-09-08 00:00:00+00';

update public.attendance_opening_balances
set academic_year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and academic_year = '2026/2027';

update public.grade_releases
set academic_year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and academic_year = '2026/2027'
  and released_at < timestamptz '2026-09-08 00:00:00+00';

update public.exam_scores
set year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and year = '2026/2027'
  and created_at < timestamptz '2026-09-08 00:00:00+00';

-- The promotion workflow captured each pupil's pre-promotion class in these
-- rows. Preserve that snapshot as the 2025/2026 roster, then create the live
-- roster from each active pupil's newly promoted class.
update public.student_year_enrolment
set academic_year = '2025/2026'
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and academic_year = '2026/2027'
  and created_at < timestamptz '2026-09-08 23:59:59+00';

insert into public.student_year_enrolment
  (school_id, student_id, class_id, academic_year)
select school_id, id, class_id, '2026/2027'
from public.students
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
  and not archived
  and class_id is not null
on conflict (student_id, academic_year) do nothing;

insert into public.audit_logs
  (school_id, module, action, description, meta)
values (
  'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid,
  'System',
  'Academic year data repaired',
  'Restored pre-8 September 2026 records to 2025/2026; preserved new-term records in 2026/2027',
  jsonb_build_object('old_year','2025/2026','current_year','2026/2027','boundary','2026-09-08')
);

do $$
begin
  if exists (
    select 1 from public.fees
    where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
      and academic_year = '2026/2027'
      and created_at < timestamptz '2026-09-08 00:00:00+00'
  ) then raise exception 'Post-repair fee verification failed'; end if;

  if exists (
    select 1 from public.attendance
    where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
      and academic_year = '2026/2027'
      and date < date '2026-09-08'
  ) then raise exception 'Post-repair attendance verification failed'; end if;

  if not exists (
    select 1 from public.fees
    where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
      and academic_year = '2026/2027'
      and created_at >= timestamptz '2026-09-08 00:00:00+00'
  ) then raise exception 'Post-repair current-year fee verification failed'; end if;
end $$;

commit;

-- Expected verification: old fees approximately 63,344 owed / 62,550 paid;
-- current fees approximately 1,098 owed / 1,059 paid at the audit snapshot.
select academic_year, count(*) as fee_rows, sum(amount) as total_owed, sum(paid) as fee_paid
from public.fees
where school_id = 'acb07950-a573-4927-bcba-2f0df0b1f85a'::uuid
group by academic_year
order by academic_year;
