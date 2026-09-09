begin;

-- Preserve the meaning of existing records while moving every school to the
-- binary attendance model used in Ghanaian schools.
update public.attendance set status = 'Present' where status = 'Late';
update public.attendance set status = 'Absent' where status = 'Excused';

alter table public.attendance
  drop constraint if exists attendance_status_check;

alter table public.attendance
  add constraint attendance_status_check
  check (status in ('Present', 'Absent'));

commit;
