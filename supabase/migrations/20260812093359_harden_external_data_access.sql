-- Close externally reachable SECURITY DEFINER entry points.
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, so every
-- privileged RPC is explicitly denied first and only required callers are
-- granted access below.

drop function if exists public.test_destroy_school(uuid);
drop function if exists public.test_setup_profile(uuid, uuid, text, text, text, boolean, uuid, uuid);

revoke execute on function public.admin_create_school(text, text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.admin_fix_archived_student_class(uuid) from public, anon, authenticated;
revoke execute on function public.admin_last_login_by_school() from public, anon, authenticated;
revoke execute on function public.admin_set_user_locked(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.allocate_receipt_nos(uuid, integer) from public, anon, authenticated;
revoke execute on function public.apply_plan_state(uuid, text) from public, anon, authenticated;
revoke execute on function public.create_auth_user(text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.create_school_user(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.generate_receipt_no(uuid) from public, anon, authenticated;
revoke execute on function public.generate_student_id(uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_active_user() from public, anon, authenticated;
revoke execute on function public.is_ministry_admin() from public, anon, authenticated;
revoke execute on function public.log_impersonation_ended(text) from public, anon, authenticated;
revoke execute on function public.my_role() from public, anon, authenticated;
revoke execute on function public.my_school_id() from public, anon, authenticated;
revoke execute on function public.reset_user_password(uuid, text) from public, anon, authenticated;
revoke execute on function public.school_plan(uuid) from public, anon, authenticated;
revoke execute on function public.school_student_limit(uuid) from public, anon, authenticated;
revoke execute on function public.school_user_limit(uuid) from public, anon, authenticated;
revoke execute on function public.setup_school(text, text, text, text, text, text, integer, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.update_auth_user(uuid, text, text, text) from public, anon, authenticated;

-- RPCs called directly by authenticated application users. Each privileged
-- administrative function also validates role/school inside its body.
grant execute on function public.admin_create_school(text, text, text, text, text, text, text, integer) to authenticated;
grant execute on function public.admin_fix_archived_student_class(uuid) to authenticated;
grant execute on function public.admin_last_login_by_school() to authenticated;
grant execute on function public.admin_set_user_locked(uuid, boolean) to authenticated;
grant execute on function public.allocate_receipt_nos(uuid, integer) to authenticated;
grant execute on function public.create_auth_user(text, text, text, text, uuid) to authenticated;
grant execute on function public.generate_receipt_no(uuid) to authenticated;
grant execute on function public.generate_student_id(uuid, text) to authenticated;
grant execute on function public.log_impersonation_ended(text) to authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_school_id() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_ministry_admin() to authenticated;
grant execute on function public.reset_user_password(uuid, text) to authenticated;
grant execute on function public.setup_school(text, text, text, text, text, text, integer, text, jsonb, jsonb) to authenticated;
grant execute on function public.update_auth_user(uuid, text, text, text) to authenticated;

-- Service-only maintenance operation; never a browser RPC.
grant execute on function public.apply_plan_state(uuid, text) to service_role;

-- Receipt allocation must be same-school and limited to finance-capable roles.
create or replace function public.allocate_receipt_nos(p_school_id uuid, p_count integer)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start bigint;
  v_out text[];
begin
  if auth.uid() is null
     or p_school_id is distinct from public.my_school_id()
     or public.my_role() not in ('superadmin', 'admin')
     or not public.is_active_user() then
    raise exception 'Not authorised';
  end if;
  if p_count is null or p_count <= 0 or p_count > 1000 then
    raise exception 'Invalid receipt count';
  end if;

  insert into public.receipt_counters (school_id, next_no)
  select p_school_id,
         coalesce(max(cast(split_part(receipt_no, '-', 2) as int)), 0) + 1
  from public.payments
  where school_id = p_school_id and receipt_no ~ '^RCP-[0-9]+$'
  on conflict (school_id) do nothing;

  update public.receipt_counters
     set next_no = next_no + p_count, updated_at = now()
   where school_id = p_school_id
  returning next_no - p_count into v_start;

  select array_agg('RCP-' || lpad((v_start + g.i)::text, 4, '0') order by g.i)
    into v_out from generate_series(0, p_count - 1) as g(i);
  return v_out;
end;
$$;

create or replace function public.generate_student_id(p_school_id uuid, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_next integer;
begin
  if auth.uid() is null
     or p_school_id is distinct from public.my_school_id()
     or public.my_role() not in ('superadmin', 'admin')
     or not public.is_active_user() then
    raise exception 'Not authorised';
  end if;
  if p_prefix is null or p_prefix !~ '^[A-Za-z0-9_-]{1,12}$' then
    raise exception 'Invalid student ID prefix';
  end if;

  select coalesce(max(cast(split_part(student_id, '-', 2) as integer)), 0) + 1
    into v_next
  from public.students
  where school_id = p_school_id
    and student_id like p_prefix || '-%'
    and split_part(student_id, '-', 2) ~ '^[0-9]+$';
  return p_prefix || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- These permissive ALL policies were OR-ed with the role policies, making the
-- subscription check an unintended alternate authorization route.
drop policy if exists plan_gate_behaviour on public.behaviour;
drop policy if exists plan_gate_announcements on public.announcements;
drop policy if exists plan_gate_audit on public.audit_logs;

-- Pin resolution for privileged and trigger functions.
alter function public.fn_set_trial_on_new_school() set search_path = public;
alter function public.is_ministry_admin() set search_path = public;
alter function public.is_active_user() set search_path = public;
alter function public.school_plan(uuid) set search_path = public;
alter function public.enforce_audit_log_identity() set search_path = public;
alter function public.handle_new_user() set search_path = public, auth;
alter function public.prevent_self_privilege_escalation() set search_path = public;
alter function public.school_student_limit(uuid) set search_path = public;
alter function public.school_user_limit(uuid) set search_path = public;
alter function public.enforce_student_limit() set search_path = public;
alter function public.update_auth_user(uuid, text, text, text) set search_path = public, auth, extensions;
alter function public.enforce_current_academic_year() set search_path = public;

-- Re-apply grants after CREATE OR REPLACE statements.
revoke execute on function public.allocate_receipt_nos(uuid, integer) from public, anon;
revoke execute on function public.generate_student_id(uuid, text) from public, anon;
grant execute on function public.allocate_receipt_nos(uuid, integer) to authenticated;
grant execute on function public.generate_student_id(uuid, text) to authenticated;
-- Ensure the plan-status view observes the caller's RLS policies.
alter view public.v_school_plan_status set (security_invoker = true);
