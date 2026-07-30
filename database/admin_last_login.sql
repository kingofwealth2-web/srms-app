-- ═══════════════════════════════════════════════════════════════════
-- Ministry Console: last sign-in per school
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- The Ministry Console's Schools tab shows a "Last Sign-in" column -- the
-- most recent time ANY user in that school signed in -- so the vendor can
-- see which client schools are actually being used and which have gone quiet.
-- The sign-in timestamp lives in auth.users.last_sign_in_at, which the client
-- (anon key) cannot read directly. This SECURITY DEFINER function exposes just
-- the per-school maximum, and only to ministry admins.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.admin_last_login_by_school()
returns table (school_id uuid, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Only the vendor's ministry admins may see cross-school sign-in data.
  if not public.is_ministry_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select p.school_id, max(u.last_sign_in_at) as last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.school_id is not null
    group by p.school_id;
end;
$$;

revoke all on function public.admin_last_login_by_school() from anon;
grant execute on function public.admin_last_login_by_school() to authenticated;
