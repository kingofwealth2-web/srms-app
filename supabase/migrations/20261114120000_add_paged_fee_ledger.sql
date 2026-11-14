-- supabase migration disable-transaction
-- Fetch a bounded fee-list page in Postgres. The old Fees screen downloaded
-- every fee and payment row before slicing to 100 rows in JavaScript.
create index concurrently if not exists idx_payments_school_fee_latest
  on public.payments (school_id, fee_id, created_at desc, id desc)
  include (receipt_no, amount);

create or replace function public.fee_ledger_page(
  p_academic_year text,
  p_period text default null,
  p_class_id uuid default null,
  p_fee_type text default null,
  p_status text default null,
  p_search text default null,
  p_exclude_archived boolean default false,
  p_page integer default 0,
  p_page_size integer default 100
)
returns table (
  id uuid,
  school_id uuid,
  student_id uuid,
  fee_type text,
  amount numeric,
  paid numeric,
  period text,
  due_date date,
  receipt_no text,
  academic_year text,
  is_arrear boolean,
  arrear_from_year text,
  template_id uuid,
  fee_period_id uuid,
  student_name text,
  student_number text,
  class_id uuid,
  effective_paid numeric,
  balance numeric,
  fee_status text,
  is_overdue boolean,
  has_payments boolean,
  latest_receipt text,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_user() or public.my_school_id() is null then
    raise exception 'An active school profile is required to view fees.' using errcode = '42501';
  end if;

  if p_page < 0 or p_page_size < 1 or p_page_size > 200 then
    raise exception 'Invalid fee page request.' using errcode = '22023';
  end if;

  return query
  with payment_totals as (
    select pay.school_id, pay.fee_id,
           sum(pay.amount)::numeric as amount_paid,
           count(*)::bigint as payment_count
    from public.payments pay
    where pay.school_id = public.my_school_id()
      and pay.academic_year = p_academic_year
    group by pay.school_id, pay.fee_id
  ), fee_rows as (
    select f.id, f.school_id, f.student_id, f.fee_type, f.amount,
           coalesce(f.paid, 0)::numeric as paid,
           f.period, f.due_date, f.receipt_no, f.academic_year,
           coalesce(f.is_arrear, false) as is_arrear, f.arrear_from_year,
           f.template_id, f.fee_period_id,
           concat_ws(' ', s.first_name, s.last_name)::text as student_name,
           s.student_id as student_number,
           coalesce(enrol.class_id, s.class_id) as class_id,
           greatest(coalesce(f.paid, 0), coalesce(pt.amount_paid, 0))::numeric as effective_paid,
           (coalesce(f.due_date < current_date, false)
             and greatest(coalesce(f.paid, 0), coalesce(pt.amount_paid, 0)) < f.amount) as is_overdue,
           coalesce(pt.payment_count, 0) > 0 as has_payments,
           coalesce(latest.receipt_no, f.receipt_no) as latest_receipt,
           coalesce(fp.academic_period, f.period) as academic_period
    from public.fees f
    join public.students s on s.id = f.student_id and s.school_id = f.school_id
    left join lateral (
      select e.class_id
      from public.student_year_enrolment e
      where e.school_id = f.school_id
        and e.student_id = f.student_id
        and e.academic_year = f.academic_year
      order by e.id
      limit 1
    ) enrol on true
    left join public.fee_periods fp
      on fp.school_id = f.school_id and fp.id = f.fee_period_id
    left join payment_totals pt on pt.school_id = f.school_id and pt.fee_id = f.id
    left join lateral (
      select pay.receipt_no
      from public.payments pay
      where pay.school_id = f.school_id and pay.fee_id = f.id
      order by pay.created_at desc, pay.id desc
      limit 1
    ) latest on true
    where f.school_id = public.my_school_id()
      and f.academic_year = p_academic_year
      and (not p_exclude_archived or not coalesce(s.archived, false))
  ), filtered as (
    select fr.*,
           (fr.amount - fr.effective_paid)::numeric as balance,
           case when fr.amount - fr.effective_paid < 0 then 'Overpaid'
                when fr.amount - fr.effective_paid = 0 then 'Paid'
                when fr.effective_paid > 0 then 'Partial'
                else 'Outstanding' end::text as fee_status
    from fee_rows fr
    where (p_period is null or fr.academic_period = p_period)
      and (p_class_id is null or fr.class_id = p_class_id)
      and (p_fee_type is null or fr.fee_type = p_fee_type)
      and (p_search is null or p_search = ''
        or fr.student_name ilike '%' || p_search || '%'
        or fr.student_number ilike '%' || p_search || '%')
  ), status_filtered as (
    select x.*
    from filtered x
    where p_status is null or p_status = ''
      or (p_status = 'Overdue' and x.is_overdue)
      or (p_status <> 'Overdue' and x.fee_status = p_status)
  )
  select x.id, x.school_id, x.student_id, x.fee_type, x.amount, x.paid,
         x.period, x.due_date, x.receipt_no, x.academic_year, x.is_arrear,
         x.arrear_from_year, x.template_id, x.fee_period_id, x.student_name,
         x.student_number, x.class_id, x.effective_paid, x.balance,
         x.fee_status, x.is_overdue, x.has_payments, x.latest_receipt,
         count(*) over ()
  from status_filtered x
  order by x.student_name, x.fee_type, x.id
  limit p_page_size offset p_page * p_page_size;
end;
$$;

revoke all on function public.fee_ledger_page(text, text, uuid, text, text, text, boolean, integer, integer) from public, anon;
grant execute on function public.fee_ledger_page(text, text, uuid, text, text, text, boolean, integer, integer) to authenticated;

create or replace function public.fee_ledger_fee_types(p_academic_year text)
returns table (fee_type text)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_user() or public.my_school_id() is null then
    raise exception 'An active school profile is required to view fees.' using errcode = '42501';
  end if;

  return query
  select distinct f.fee_type
  from public.fees f
  where f.school_id = public.my_school_id()
    and f.academic_year = p_academic_year
  order by f.fee_type;
end;
$$;

revoke all on function public.fee_ledger_fee_types(text) from public, anon;
grant execute on function public.fee_ledger_fee_types(text) to authenticated;
