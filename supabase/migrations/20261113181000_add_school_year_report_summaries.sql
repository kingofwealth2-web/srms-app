-- Return compact per-student aggregates for Reports and report cards. These
-- replace downloading every attendance, fee, and payment row into the browser.
-- Functions run as the caller, so the existing table RLS policies remain in
-- force. The school id comes from the authenticated profile, never the client.

create or replace function public.report_attendance_by_student(
  p_academic_year text,
  p_period text default null,
  p_class_id uuid default null
)
returns table (
  student_id uuid,
  class_id uuid,
  total bigint,
  present bigint,
  absent bigint,
  rate integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with live as (
    select a.student_id, a.class_id,
           count(*)::bigint as total,
           count(*) filter (where a.status = 'Present')::bigint as present,
           count(*) filter (where a.status = 'Absent')::bigint as absent
    from public.attendance a
    where auth.uid() is not null
      and public.is_active_user()
      and a.school_id = public.my_school_id()
      and a.academic_year = p_academic_year
      and (p_period is null or a.period = p_period)
      and (p_class_id is null or a.class_id = p_class_id)
    group by a.student_id, a.class_id
  ), opening as (
    select b.student_id, b.class_id,
           sum(b.total_days)::bigint as total,
           sum(b.present_days)::bigint as present
    from public.attendance_opening_balances b
    where auth.uid() is not null
      and public.is_active_user()
      and b.school_id = public.my_school_id()
      and b.academic_year = p_academic_year
      and (p_period is null or b.period = p_period)
      and (p_class_id is null or b.class_id = p_class_id)
    group by b.student_id, b.class_id
  ), combined as (
    select coalesce(l.student_id, o.student_id) as student_id,
           coalesce(l.class_id, o.class_id) as class_id,
           coalesce(l.total, 0) + coalesce(o.total, 0) as total,
           coalesce(l.present, 0) + coalesce(o.present, 0) as present,
           coalesce(l.absent, 0) as absent
    from live l
    full join opening o
      on o.student_id = l.student_id
     and o.class_id is not distinct from l.class_id
  )
  select c.student_id, c.class_id, c.total, c.present, c.absent,
         case when c.total = 0 then null
              else round(100.0 * c.present / c.total)::integer end as rate
  from combined c;
$$;

create or replace function public.report_attendance_by_class_date(
  p_academic_year text,
  p_date date
)
returns table (class_id uuid, records bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select a.class_id, count(*)::bigint as records
  from public.attendance a
  where auth.uid() is not null
    and public.is_active_user()
    and a.school_id = public.my_school_id()
    and a.academic_year = p_academic_year
    and a.date = p_date
  group by a.class_id;
$$;

create or replace function public.report_fees_by_student(
  p_academic_year text,
  p_period text default null
)
returns table (
  student_id uuid,
  class_id uuid,
  owed numeric,
  paid numeric,
  collected numeric,
  outstanding numeric,
  overdue_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with eligible_fees as (
    select f.id, f.student_id,
           coalesce(e.class_id, s.class_id) as class_id,
           f.amount::numeric as amount,
           f.due_date,
           greatest(coalesce(f.paid, 0), coalesce(p.amount_paid, 0))::numeric as effective_paid
    from public.fees f
    join public.students s
      on s.id = f.student_id and s.school_id = f.school_id
    left join public.student_year_enrolment e
      on e.school_id = f.school_id
     and e.student_id = f.student_id
     and e.academic_year = f.academic_year
    left join public.fee_periods fp
      on fp.school_id = f.school_id
     and fp.id = f.fee_period_id
    left join lateral (
      select sum(pay.amount)::numeric as amount_paid
      from public.payments pay
      where pay.school_id = f.school_id and pay.fee_id = f.id
    ) p on true
    where auth.uid() is not null
      and public.is_active_user()
      and f.school_id = public.my_school_id()
      and f.academic_year = p_academic_year
      and (p_period is null or coalesce(fp.academic_period, f.period) = p_period)
  )
  select ef.student_id, ef.class_id,
         sum(ef.amount)::numeric as owed,
         sum(ef.effective_paid)::numeric as paid,
         sum(least(ef.amount, ef.effective_paid))::numeric as collected,
         sum(greatest(0, ef.amount - ef.effective_paid))::numeric as outstanding,
         count(*) filter (where ef.due_date < current_date and ef.effective_paid < ef.amount)::bigint as overdue_count
  from eligible_fees ef
  group by ef.student_id, ef.class_id;
$$;

revoke all on function public.report_attendance_by_student(text, text, uuid) from public, anon;
revoke all on function public.report_attendance_by_class_date(text, date) from public, anon;
revoke all on function public.report_fees_by_student(text, text) from public, anon;
grant execute on function public.report_attendance_by_student(text, text, uuid) to authenticated;
grant execute on function public.report_attendance_by_class_date(text, date) to authenticated;
grant execute on function public.report_fees_by_student(text, text) to authenticated;
