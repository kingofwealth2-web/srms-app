-- ═══════════════════════════════════════════════════════════
-- SRMS — Complete Supabase Database Schema
-- Paste this entire file into Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text not null,
  email       text,
  role        text not null default 'teacher' check (role in ('superadmin','admin','classteacher','teacher')),
  class_id    uuid,
  subject_id  uuid,
  locked      boolean default false,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. SETTINGS
create table if not exists public.settings (
  id             uuid default gen_random_uuid() primary key,
  school_name    text default 'Westbrook Academy',
  address        text default '100 Academy Drive',
  motto          text default 'Knowledge · Integrity · Excellence',
  academic_year  text default '2024-2025',
  period_type    text default 'semester' check (period_type in ('semester','term')),
  period_count   int  default 2,
  grading_scale  jsonb default '[
    {"min":90,"max":100,"letter":"A+","gpa":4.0},
    {"min":80,"max":89,"letter":"A","gpa":4.0},
    {"min":70,"max":79,"letter":"B","gpa":3.0},
    {"min":60,"max":69,"letter":"C","gpa":2.0},
    {"min":50,"max":59,"letter":"D","gpa":1.0},
    {"min":0,"max":49,"letter":"F","gpa":0.0}
  ]'::jsonb,
  score_weights  jsonb default '{"classwork":10,"homework":10,"midsemester":20,"final_exam":50,"project":10}'::jsonb,
  updated_at     timestamptz default now()
);
alter table public.settings enable row level security;
create policy "Anyone can read settings" on public.settings for select using (true);
create policy "Admins can update settings" on public.settings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('superadmin','admin'))
);
-- Insert default settings row
insert into public.settings (id) values (gen_random_uuid()) on conflict do nothing;

-- 3. CLASSES
create table if not exists public.classes (
  id                uuid default gen_random_uuid() primary key,
  name              text not null,
  level             text,
  section           text,
  class_teacher_id  uuid references public.profiles(id) on delete set null,
  created_at        timestamptz default now()
);
alter table public.classes enable row level security;
create policy "Anyone can read classes" on public.classes for select using (true);
create policy "Admins can manage classes" on public.classes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('superadmin','admin'))
);

-- 4. SUBJECTS
create table if not exists public.subjects (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  code        text,
  class_id    uuid references public.classes(id) on delete cascade,
  teacher_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);
alter table public.subjects enable row level security;
create policy "Anyone can read subjects" on public.subjects for select using (true);
create policy "Admins can manage subjects" on public.subjects for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('superadmin','admin'))
);

-- 5. STUDENTS
create table if not exists public.students (
  id            uuid default gen_random_uuid() primary key,
  student_id    text unique not null,
  first_name    text not null,
  last_name     text not null,
  class_id      uuid references public.classes(id) on delete set null,
  dob           date,
  gender        text,
  phone         text,
  email         text,
  address       text,
  medical_info  text default 'None',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.students enable row level security;
create policy "Authenticated users can read students" on public.students for select using (auth.role() = 'authenticated');
create policy "Admins can manage students" on public.students for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('superadmin','admin'))
);

-- 6. GRADES
create table if not exists public.grades (
  id           uuid default gen_random_uuid() primary key,
  student_id   uuid references public.students(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete cascade,
  classwork    numeric(5,2) default 0,
  homework     numeric(5,2) default 0,
  midsemester  numeric(5,2) default 0,
  final_exam   numeric(5,2) default 0,
  project      numeric(5,2) default 0,
  period       text not null,
  year         text,
  created_at   timestamptz default now(),
  unique(student_id, subject_id, period, year)
);
alter table public.grades enable row level security;
create policy "Teachers can read grades" on public.grades for select using (auth.role() = 'authenticated');
create policy "Teachers can manage their subject grades" on public.grades for all using (
  exists (
    select 1 from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = grades.subject_id
    and (p.role in ('superadmin','admin') or s.teacher_id = auth.uid())
  )
);

-- 7. ATTENDANCE
create table if not exists public.attendance (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references public.students(id) on delete cascade,
  class_id    uuid references public.classes(id) on delete cascade,
  date        date not null,
  status      text not null check (status in ('Present','Absent','Late','Excused')),
  marked_by   uuid references public.profiles(id),
  created_at  timestamptz default now(),
  unique(student_id, class_id, date)
);
alter table public.attendance enable row level security;
create policy "Authenticated can read attendance" on public.attendance for select using (auth.role() = 'authenticated');
create policy "Teachers can manage attendance" on public.attendance for all using (auth.role() = 'authenticated');

-- 8. FEES
create table if not exists public.fees (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references public.students(id) on delete cascade,
  fee_type    text not null,
  amount      numeric(10,2) not null default 0,
  paid        numeric(10,2) default 0,
  due_date    date,
  receipt_no  text unique,
  created_at  timestamptz default now()
);
alter table public.fees enable row level security;
create policy "Authenticated can read fees" on public.fees for select using (auth.role() = 'authenticated');
create policy "Admins can manage fees" on public.fees for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('superadmin','admin'))
);

-- 9. BEHAVIOUR
create table if not exists public.behaviour (
  id                uuid default gen_random_uuid() primary key,
  student_id        uuid references public.students(id) on delete cascade,
  type              text not null check (type in ('Discipline','Achievement','Club Activity','Notes')),
  title             text not null,
  description       text,
  date              date default current_date,
  recorded_by_id    uuid references public.profiles(id),
  recorded_by_name  text,
  created_at        timestamptz default now()
);
alter table public.behaviour enable row level security;
create policy "Authenticated can read behaviour" on public.behaviour for select using (auth.role() = 'authenticated');
create policy "Teachers can manage behaviour" on public.behaviour for all using (auth.role() = 'authenticated');

-- 10. ANNOUNCEMENTS
create table if not exists public.announcements (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  body             text not null,
  target_role      text default 'all',
  active           boolean default true,
  posted_by_id     uuid references public.profiles(id),
  posted_by_name   text,
  created_at       timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "Authenticated can read announcements" on public.announcements for select using (auth.role() = 'authenticated');
create policy "Admins can manage announcements" on public.announcements for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('superadmin','admin'))
);

-- ═══════════════════════════════════════════════════════════
-- SEED DATA — Sample classes, subjects, students
-- ═══════════════════════════════════════════════════════════

-- Sample classes
insert into public.classes (id, name, level, section) values
  ('11111111-0001-0001-0001-000000000001', 'Grade 10 — Alpha', 'Grade 10', 'Alpha'),
  ('11111111-0001-0001-0001-000000000002', 'Grade 10 — Beta',  'Grade 10', 'Beta'),
  ('11111111-0001-0001-0001-000000000003', 'Grade 11 — Alpha', 'Grade 11', 'Alpha')
on conflict do nothing;

-- Sample subjects
insert into public.subjects (name, code, class_id) values
  ('Mathematics',    'MTH-101', '11111111-0001-0001-0001-000000000001'),
  ('English',        'ENG-101', '11111111-0001-0001-0001-000000000001'),
  ('Physics',        'PHY-101', '11111111-0001-0001-0001-000000000002'),
  ('Chemistry',      'CHM-101', '11111111-0001-0001-0001-000000000002'),
  ('Biology',        'BIO-101', '11111111-0001-0001-0001-000000000003')
on conflict do nothing;

-- Sample students
insert into public.students (student_id, first_name, last_name, class_id, gender, dob, medical_info) values
  ('STU-0001','Emma',   'Wilson',  '11111111-0001-0001-0001-000000000001','Female','2008-03-15','None'),
  ('STU-0002','Liam',   'Johnson', '11111111-0001-0001-0001-000000000001','Male',  '2008-07-22','Mild asthma'),
  ('STU-0003','Olivia', 'Davis',   '11111111-0001-0001-0001-000000000001','Female','2008-11-09','None'),
  ('STU-0004','Noah',   'Martinez','11111111-0001-0001-0001-000000000002','Male',  '2007-05-14','None'),
  ('STU-0005','Ava',    'Garcia',  '11111111-0001-0001-0001-000000000002','Female','2007-09-30','Peanut allergy'),
  ('STU-0006','William','Brown',   '11111111-0001-0001-0001-000000000003','Male',  '2006-01-18','None')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════
-- DONE. Your database is ready.
-- ═══════════════════════════════════════════════════════════
