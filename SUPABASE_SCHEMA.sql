-- ═══════════════════════════════════════════════════════════════════
-- SRMS — Multi-Tenant Supabase Schema
-- Paste into Supabase → SQL Editor → Run
--
-- Role hierarchy:
--   ministry_admin  → sees ALL schools (ministry-level)
--   superadmin      → sees ONE school (school owner/head)
--   admin           → manages one school
--   classteacher    → one class
--   teacher         → assigned subjects only
-- ═══════════════════════════════════════════════════════════════════

-- ── EXTENSIONS ────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── HELPER: current user's school_id ──────────────────────────────
-- Used inside RLS policies to avoid repeated subqueries
create or replace function public.my_school_id()
returns uuid language sql stable security definer as $$
  select school_id from public.profiles where id = auth.uid()
$$;

-- ── HELPER: current user's role ───────────────────────────────────
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── HELPER: is ministry admin ─────────────────────────────────────
create or replace function public.is_ministry_admin()
returns boolean language sql stable security definer as $$
  select coalesce(
    (select role = 'ministry_admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 1. SCHOOLS
--    One row per school. The ministry_admin can see all rows.
--    Each school's staff only sees their own.
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.schools (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  address      text,
  region       text,
  district     text,
  phone        text,
  email        text,
  logo_url     text,
  active       boolean default true,
  created_at   timestamptz default now()
);
alter table public.schools enable row level security;

create policy "Ministry admins can manage all schools"
  on public.schools for all
  using (public.is_ministry_admin())
  with check (public.is_ministry_admin());

create policy "School staff can read own school"
  on public.schools for select
  using (id = public.my_school_id());

-- ═══════════════════════════════════════════════════════════════════
-- 2. PROFILES (extends auth.users)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  school_id   uuid references public.schools(id) on delete cascade,
  full_name   text not null,
  email       text,
  role        text not null default 'teacher' check (
                role in ('ministry_admin','superadmin','admin','classteacher','teacher')
              ),
  class_id    uuid,
  subject_id  uuid,
  locked      boolean default false,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

-- Ministry admins see everyone
create policy "Ministry admins read all profiles"
  on public.profiles for select
  using (public.is_ministry_admin());

-- School staff read profiles in same school
create policy "School staff read own school profiles"
  on public.profiles for select
  using (school_id = public.my_school_id());

-- Users update only their own profile (non-role fields)
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    -- Cannot self-escalate role
    role = (select role from public.profiles where id = auth.uid())
    and school_id = (select school_id from public.profiles where id = auth.uid())
  );

-- Admins manage profiles in their school
create policy "Admins manage school profiles"
  on public.profiles for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
  );

-- Admins can insert/update/delete profiles in their school
-- (profile creation for new users is handled by the trigger, which runs as security definer
--  and bypasses RLS — this policy covers admin-initiated operations like inviting users)
create policy "Admins manage school profiles"
  on public.profiles for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
  )
  with check (
    -- Admins cannot insert/update a profile to a role higher than their own
    -- and cannot assign profiles to a different school
    school_id = public.my_school_id()
    and role != 'ministry_admin'
  );
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enforce locked: locked users cannot query anything
-- (checked in every policy via this helper)
create or replace function public.is_active_user()
returns boolean language sql stable security definer as $$
  select coalesce(
    (select not locked from public.profiles where id = auth.uid()),
    false
  )
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. SETTINGS (one row per school)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.settings (
  id                  uuid default gen_random_uuid() primary key,
  school_id           uuid references public.schools(id) on delete cascade unique not null,
  school_name         text default 'My School',
  address             text,
  motto               text,
  phone               text,
  email               text,
  logo_url            text,
  academic_year       text default '2024/2025',
  period_type         text default 'semester' check (period_type in ('semester','term')),
  period_count        int  default 2,
  currency_code       text default 'GHS',
  currency_position   text default 'before',
  currency_decimals   int  default 2,
  grading_scale       jsonb default '[
    {"min":80,"max":100,"letter":"A","gpa":4.0,"remark":"Excellent"},
    {"min":65,"max":79, "letter":"B","gpa":3.0,"remark":"Very Good"},
    {"min":50,"max":64, "letter":"C","gpa":2.0,"remark":"Good"},
    {"min":0, "max":49, "letter":"F","gpa":0.0,"remark":"Fail"}
  ]'::jsonb,
  grade_components    jsonb default '[
    {"key":"classwork",   "label":"Classwork",   "max_score":10,"weight":10,"enabled":true},
    {"key":"homework",    "label":"Homework",    "max_score":10,"weight":10,"enabled":true},
    {"key":"midsemester", "label":"Midsemester", "max_score":20,"weight":20,"enabled":true},
    {"key":"final_exam",  "label":"Final Exam",  "max_score":50,"weight":50,"enabled":true},
    {"key":"project",     "label":"Project",     "max_score":10,"weight":10,"enabled":true}
  ]'::jsonb,
  custom_holidays     jsonb default '[]'::jsonb,
  vacations           jsonb default '[]'::jsonb,
  updated_at          timestamptz default now()
);
alter table public.settings enable row level security;

create policy "Ministry admins read all settings"
  on public.settings for select
  using (public.is_ministry_admin());

create policy "School staff read own settings"
  on public.settings for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins update own settings"
  on public.settings for update
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

create policy "Superadmin insert settings"
  on public.settings for insert
  with check (
    school_id = public.my_school_id()
    and public.my_role() = 'superadmin'
  );

create policy "Ministry admin manage all settings"
  on public.settings for all
  using (public.is_ministry_admin());

-- ═══════════════════════════════════════════════════════════════════
-- 4. CLASSES
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.classes (
  id                uuid default gen_random_uuid() primary key,
  school_id         uuid references public.schools(id) on delete cascade not null,
  name              text not null,
  level             text,
  section           text,
  class_teacher_id  uuid references public.profiles(id) on delete set null,
  created_at        timestamptz default now()
);
alter table public.classes enable row level security;

create policy "Ministry admins read all classes"
  on public.classes for select using (public.is_ministry_admin());

create policy "School staff read own classes"
  on public.classes for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins manage classes"
  on public.classes for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 5. SUBJECTS
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.subjects (
  id          uuid default gen_random_uuid() primary key,
  school_id   uuid references public.schools(id) on delete cascade not null,
  name        text not null,
  code        text,
  class_id    uuid references public.classes(id) on delete cascade,
  teacher_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);
alter table public.subjects enable row level security;

create policy "Ministry admins read all subjects"
  on public.subjects for select using (public.is_ministry_admin());

create policy "School staff read own subjects"
  on public.subjects for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins manage subjects"
  on public.subjects for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 6. STUDENTS
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.students (
  id               uuid default gen_random_uuid() primary key,
  school_id        uuid references public.schools(id) on delete cascade not null,
  student_id       text not null,
  first_name       text not null,
  last_name        text not null,
  class_id         uuid references public.classes(id) on delete set null,
  dob              date,
  gender           text,
  phone            text,
  email            text,
  address          text,
  photo_url        text,
  medical_info     text default 'None',
  guardian_name    text,
  guardian_phone   text,
  guardian_email   text,
  archived         boolean default false,
  graduation_year  text,
  entry_year       text,
  leaving_reason   text,
  leaving_notes    text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(school_id, student_id)   -- student_id unique per school, not globally
);
alter table public.students enable row level security;

create policy "Ministry admins read all students"
  on public.students for select using (public.is_ministry_admin());

create policy "School staff read own students"
  on public.students for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins manage students"
  on public.students for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 7. STUDENT YEAR ENROLMENT
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.student_year_enrolment (
  id             uuid default gen_random_uuid() primary key,
  school_id      uuid references public.schools(id) on delete cascade not null,
  student_id     uuid references public.students(id) on delete cascade,
  class_id       uuid references public.classes(id) on delete set null,
  academic_year  text not null,
  created_at     timestamptz default now(),
  unique(school_id, student_id, academic_year)
);
alter table public.student_year_enrolment enable row level security;

create policy "Ministry admins read all enrolments"
  on public.student_year_enrolment for select using (public.is_ministry_admin());

create policy "School staff read own enrolments"
  on public.student_year_enrolment for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins manage enrolments"
  on public.student_year_enrolment for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 8. GRADES
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.grades (
  id           uuid default gen_random_uuid() primary key,
  school_id    uuid references public.schools(id) on delete cascade not null,
  student_id   uuid references public.students(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete cascade,
  classwork    numeric(5,2) default 0,
  homework     numeric(5,2) default 0,
  midsemester  numeric(5,2) default 0,
  final_exam   numeric(5,2) default 0,
  project      numeric(5,2) default 0,
  period       text not null,
  year         text not null,
  created_at   timestamptz default now(),
  unique(school_id, student_id, subject_id, period, year)
);
alter table public.grades enable row level security;

create policy "Ministry admins read all grades"
  on public.grades for select using (public.is_ministry_admin());

create policy "School staff read own grades"
  on public.grades for select
  using (school_id = public.my_school_id() and public.is_active_user());

-- Teachers can only write grades for their own subjects
create policy "Teachers manage own subject grades"
  on public.grades for all
  using (
    school_id = public.my_school_id()
    and public.is_active_user()
    and (
      public.my_role() in ('superadmin','admin')
      or exists (
        select 1 from public.subjects s
        where s.id = grades.subject_id
        and s.teacher_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- 9. ATTENDANCE
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.attendance (
  id             uuid default gen_random_uuid() primary key,
  school_id      uuid references public.schools(id) on delete cascade not null,
  student_id     uuid references public.students(id) on delete cascade,
  class_id       uuid references public.classes(id) on delete cascade,
  date           date not null,
  status         text not null check (status in ('Present','Absent','Late','Excused')),
  academic_year  text not null,
  marked_by      uuid references public.profiles(id),
  created_at     timestamptz default now(),
  unique(school_id, student_id, date)
);
alter table public.attendance enable row level security;

create policy "Ministry admins read all attendance"
  on public.attendance for select using (public.is_ministry_admin());

create policy "School staff read own attendance"
  on public.attendance for select
  using (school_id = public.my_school_id() and public.is_active_user());

-- Class teachers manage their own class; admins manage all
create policy "Teachers manage own class attendance"
  on public.attendance for all
  using (
    school_id = public.my_school_id()
    and public.is_active_user()
    and (
      public.my_role() in ('superadmin','admin')
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
        and p.class_id = attendance.class_id
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- 10. FEES
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.fees (
  id               uuid default gen_random_uuid() primary key,
  school_id        uuid references public.schools(id) on delete cascade not null,
  student_id       uuid references public.students(id) on delete cascade,
  fee_type         text not null,
  amount           numeric(10,2) not null default 0,
  paid             numeric(10,2) default 0 check (paid >= 0),
  balance          numeric(10,2) generated always as (amount - paid) stored,
  status           text generated always as (
                     case
                       when paid >= amount then 'Paid'
                       when paid > 0 then 'Partial'
                       else 'Outstanding'
                     end
                   ) stored,
  period           text,
  due_date         date,
  receipt_no       text,
  academic_year    text not null,
  is_arrear        boolean default false,
  arrear_from_year text,
  created_at       timestamptz default now(),
  unique(school_id, receipt_no)  -- receipt unique per school
);
alter table public.fees enable row level security;

create policy "Ministry admins read all fees"
  on public.fees for select using (public.is_ministry_admin());

create policy "Admins read own fees"
  on public.fees for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins manage fees"
  on public.fees for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 11. PAYMENTS
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.payments (
  id             uuid default gen_random_uuid() primary key,
  school_id      uuid references public.schools(id) on delete cascade not null,
  fee_id         uuid references public.fees(id) on delete cascade,
  student_id     uuid references public.students(id) on delete cascade,
  class_id       uuid references public.classes(id) on delete set null,
  amount         numeric(10,2) not null,
  receipt_no     text,
  payment_method text,
  recorded_by    uuid references public.profiles(id),
  academic_year  text not null,
  created_at     timestamptz default now()
);
alter table public.payments enable row level security;

create policy "Ministry admins read all payments"
  on public.payments for select using (public.is_ministry_admin());

create policy "Admins read own payments"
  on public.payments for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins manage payments"
  on public.payments for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 12. BEHAVIOUR
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.behaviour (
  id                uuid default gen_random_uuid() primary key,
  school_id         uuid references public.schools(id) on delete cascade not null,
  student_id        uuid references public.students(id) on delete cascade,
  type              text not null check (type in ('Discipline','Achievement','Club Activity','Notes')),
  title             text not null,
  description       text,
  date              date default current_date,
  academic_year     text not null,
  recorded_by_id    uuid references public.profiles(id),
  recorded_by_name  text,
  created_at        timestamptz default now()
);
alter table public.behaviour enable row level security;

create policy "Ministry admins read all behaviour"
  on public.behaviour for select using (public.is_ministry_admin());

create policy "School staff read own behaviour"
  on public.behaviour for select
  using (school_id = public.my_school_id() and public.is_active_user());

-- Any active teacher can insert behaviour records
create policy "Teachers insert behaviour"
  on public.behaviour for insert
  with check (
    school_id = public.my_school_id()
    and public.is_active_user()
  );

-- Only admins or the original recorder can update
create policy "Admins or recorder update behaviour"
  on public.behaviour for update
  using (
    school_id = public.my_school_id()
    and public.is_active_user()
    and (
      public.my_role() in ('superadmin','admin')
      or recorded_by_id = auth.uid()
    )
  );

-- Only admins or the original recorder can delete
create policy "Admins or recorder delete behaviour"
  on public.behaviour for delete
  using (
    school_id = public.my_school_id()
    and public.is_active_user()
    and (
      public.my_role() in ('superadmin','admin')
      or recorded_by_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- 13. ANNOUNCEMENTS
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.announcements (
  id               uuid default gen_random_uuid() primary key,
  school_id        uuid references public.schools(id) on delete cascade not null,
  title            text not null,
  body             text not null,
  target_role      text default 'all',
  active           boolean default true,
  posted_by_id     uuid references public.profiles(id),
  posted_by_name   text,
  academic_year    text not null,
  created_at       timestamptz default now()
);
alter table public.announcements enable row level security;

create policy "Ministry admins read all announcements"
  on public.announcements for select using (public.is_ministry_admin());

create policy "School staff read own announcements"
  on public.announcements for select
  using (school_id = public.my_school_id() and public.is_active_user());

create policy "Admins manage announcements"
  on public.announcements for all
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 14. AUDIT LOGS
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.audit_logs (
  id           uuid default gen_random_uuid() primary key,
  school_id    uuid references public.schools(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  user_name    text,
  module       text,
  action       text,
  description  text,
  meta         jsonb default '{}'::jsonb,
  before_data  jsonb,
  after_data   jsonb,
  ip_address   text,
  created_at   timestamptz default now()
);
alter table public.audit_logs enable row level security;

create policy "Ministry admins read all audit logs"
  on public.audit_logs for select using (public.is_ministry_admin());

create policy "Superadmins read own school audit logs"
  on public.audit_logs for select
  using (
    school_id = public.my_school_id()
    and public.my_role() in ('superadmin','admin')
    and public.is_active_user()
  );

-- Any authenticated active user can insert audit logs
create policy "Authenticated users insert audit logs"
  on public.audit_logs for insert
  with check (
    public.is_active_user()
    and (
      -- School users must log against their own school
      (school_id = public.my_school_id() and school_id is not null)
      -- Ministry admins can log without a school_id
      or public.is_ministry_admin()
    )
  );

-- Audit logs are immutable — no updates or deletes
-- (no update/delete policy = blocked by RLS)

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES — performance at scale
-- ═══════════════════════════════════════════════════════════════════
create index if not exists idx_profiles_school      on public.profiles(school_id);
create index if not exists idx_students_school      on public.students(school_id);
create index if not exists idx_students_class       on public.students(class_id);
create index if not exists idx_grades_school_year   on public.grades(school_id, year);
create index if not exists idx_grades_student       on public.grades(student_id);
create index if not exists idx_attendance_school    on public.attendance(school_id, academic_year);
create index if not exists idx_attendance_date      on public.attendance(date);
create index if not exists idx_fees_school_year     on public.fees(school_id, academic_year);
create index if not exists idx_fees_student         on public.fees(student_id);
create index if not exists idx_payments_school      on public.payments(school_id, academic_year);
create index if not exists idx_behaviour_school     on public.behaviour(school_id, academic_year);
create index if not exists idx_announcements_school on public.announcements(school_id, academic_year);
create index if not exists idx_audit_school         on public.audit_logs(school_id, created_at desc);
create index if not exists idx_enrolment_school     on public.student_year_enrolment(school_id, academic_year);

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION NOTES (for existing single-school deployments)
-- ═══════════════════════════════════════════════════════════════════
-- If migrating from the old single-school schema:
--
-- 1. Create your first school row:
--    insert into public.schools (id, name) values ('<your-uuid>', 'Your School Name');
--
-- 2. Backfill school_id on all tables:
--    update public.profiles     set school_id = '<your-uuid>';
--    update public.students     set school_id = '<your-uuid>';
--    update public.classes      set school_id = '<your-uuid>';
--    update public.subjects     set school_id = '<your-uuid>';
--    update public.grades       set school_id = '<your-uuid>';
--    update public.attendance   set school_id = '<your-uuid>';
--    update public.fees         set school_id = '<your-uuid>';
--    update public.payments     set school_id = '<your-uuid>';
--    update public.behaviour    set school_id = '<your-uuid>';
--    update public.announcements set school_id = '<your-uuid>';
--    update public.settings     set school_id = '<your-uuid>';
--
-- 3. Create settings row for the school:
--    insert into public.settings (school_id) values ('<your-uuid>');
--
-- 4. Assign ministry_admin role to ministry-level users:
--    update public.profiles set role = 'ministry_admin', school_id = null
--    where id = '<ministry-user-uuid>';
--
-- ═══════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════