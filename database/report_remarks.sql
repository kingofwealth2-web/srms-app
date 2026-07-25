-- ═══════════════════════════════════════════════════════════════════
-- Report-card remarks, stored so any device can see them
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- Class-teacher and head-teacher remarks lived only in the browser session
-- of whoever was generating the cards, so the class teacher and the head
-- teacher had to be at the same machine to produce a complete card. This
-- persists both, keyed per student per period per year, so a class teacher
-- enters remarks on their own device and an admin/head prints from theirs.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.report_remarks (
  id                   uuid default gen_random_uuid() primary key,
  school_id            uuid references public.schools(id)  on delete cascade not null,
  student_id           uuid references public.students(id) on delete cascade not null,
  period               text not null,
  year                 text not null,
  class_teacher_remark text,
  head_teacher_remark  text,
  promoted_to          text,
  updated_by           uuid,
  updated_at           timestamptz default now(),
  unique(school_id, student_id, period, year)
);
alter table public.report_remarks enable row level security;

-- Ministry admins read everything.
create policy "Ministry admins read all report_remarks"
  on public.report_remarks for select
  using (public.is_ministry_admin());

-- Superadmin/admin: full access within their own school.
create policy "Admins manage school report_remarks"
  on public.report_remarks for all
  using      (school_id = public.my_school_id() and public.my_role() in ('superadmin','admin'))
  with check (school_id = public.my_school_id() and public.my_role() in ('superadmin','admin'));

-- Class teachers: read and write remarks for students in THEIR class only.
-- (Row-level, so a class teacher could in principle write the head column via
--  a crafted request; the app never does. Acceptable within a school's own
--  trusted staff, consistent with the rest of the app's model.)
create policy "Class teachers read own class report_remarks"
  on public.report_remarks for select
  using (
    school_id = public.my_school_id()
    and student_id in (
      select id from public.students
      where class_id = (select class_id from public.profiles where id = auth.uid())
    )
  );

create policy "Class teachers insert own class report_remarks"
  on public.report_remarks for insert
  with check (
    school_id = public.my_school_id()
    and student_id in (
      select id from public.students
      where class_id = (select class_id from public.profiles where id = auth.uid())
    )
  );

create policy "Class teachers update own class report_remarks"
  on public.report_remarks for update
  using (
    school_id = public.my_school_id()
    and student_id in (
      select id from public.students
      where class_id = (select class_id from public.profiles where id = auth.uid())
    )
  )
  with check (
    school_id = public.my_school_id()
    and student_id in (
      select id from public.students
      where class_id = (select class_id from public.profiles where id = auth.uid())
    )
  );

grant select, insert, update, delete on public.report_remarks to authenticated;

-- Existing databases: add the promotion column in place.
alter table public.report_remarks add column if not exists promoted_to text;
