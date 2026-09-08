alter table public.settings
  add column if not exists current_period text;

-- Existing schools begin at their first configured period. Administrators can
-- immediately choose another period in Settings if their calendar differs.
update public.settings
set current_period = case when period_type = 'term' then 'Term 1' else 'Semester 1' end
where current_period is null or btrim(current_period) = '';

create or replace function public.reset_current_period_on_rollover()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.academic_year is distinct from new.academic_year
     and current_setting('srms.year_rollover', true) = 'on' then
    new.current_period := case when new.period_type = 'term' then 'Term 1' else 'Semester 1' end;
  end if;
  return new;
end;
$$;

revoke execute on function public.reset_current_period_on_rollover() from public, anon, authenticated;

drop trigger if exists settings_reset_current_period_on_rollover on public.settings;
create trigger settings_reset_current_period_on_rollover
before update of academic_year on public.settings
for each row execute function public.reset_current_period_on_rollover();
