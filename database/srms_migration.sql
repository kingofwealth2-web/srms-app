-- ============================================================
-- SRMS — Full Database Migration
-- Version: v2.1
-- Generated: 2026-05-30
-- Run this on a fresh Supabase project to set up SRMS schema.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS schools (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  address    text,
  region     text,
  district   text,
  phone      text,
  email      text,
  logo_url   text,
  active     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name            text NOT NULL,
  email                text,
  role                 text NOT NULL DEFAULT 'teacher',
  class_id             uuid,
  subject_id           uuid,
  locked               boolean DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  temp_password        text,
  must_change_password boolean DEFAULT false,
  school_id            uuid REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS settings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name              text DEFAULT 'Westbrook Academy',
  address                  text DEFAULT '100 Academy Drive',
  motto                    text DEFAULT 'Knowledge · Integrity · Excellence',
  academic_year            text DEFAULT '2024-2025',
  period_type              text DEFAULT 'semester',
  period_count             integer DEFAULT 2,
  grading_scale            jsonb DEFAULT '[{"gpa":4.0,"max":100,"min":90,"letter":"A+"},{"gpa":4.0,"max":89,"min":80,"letter":"A"},{"gpa":3.0,"max":79,"min":70,"letter":"B"},{"gpa":2.0,"max":69,"min":60,"letter":"C"},{"gpa":1.0,"max":59,"min":50,"letter":"D"},{"gpa":0.0,"max":49,"min":0,"letter":"F"}]',
  score_weights            jsonb DEFAULT '{"project":10,"homework":10,"classwork":10,"final_exam":50,"midsemester":20}',
  updated_at               timestamptz DEFAULT now(),
  grade_components         jsonb,
  currency_code            text DEFAULT 'GHS',
  currency_position        text DEFAULT 'before',
  currency_decimals        integer DEFAULT 2,
  school_logo              text,
  available_years          jsonb DEFAULT '[]',
  year_start_date          text,
  year_end_date            text,
  score_decimals           boolean DEFAULT false,
  vacations                jsonb DEFAULT '[]',
  custom_holidays          jsonb DEFAULT '[]',
  school_id                uuid REFERENCES schools(id),
  plan                     text NOT NULL DEFAULT 'trial',
  billing_cycle            text NOT NULL DEFAULT 'monthly',
  trial_ends_at            timestamptz,
  plan_expires_at          timestamptz,
  grace_ends_at            timestamptz,
  cancelled_at             timestamptz,
  paystack_customer_id     text,
  paystack_subscription_code text,
  grade_system             text NOT NULL DEFAULT 'letter',
  student_id_prefix        text NOT NULL DEFAULT 'STU'
);

CREATE TABLE IF NOT EXISTS classes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  level            text,
  section          text,
  class_teacher_id uuid REFERENCES profiles(id),
  created_at       timestamptz DEFAULT now(),
  sort_order       integer,
  is_terminal      boolean DEFAULT false,
  school_id        uuid REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  school_id  uuid REFERENCES schools(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      text NOT NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  class_id        uuid REFERENCES classes(id),
  dob             date,
  gender          text,
  phone           text,
  email           text,
  address         text,
  medical_info    text DEFAULT 'None',
  created_at      timestamptz DEFAULT now(),
  school_id       uuid REFERENCES schools(id),
  archived        boolean DEFAULT false,
  graduation_year text,
  leaving_reason  text,
  leaving_notes   text,
  entry_year      text,
  middle_name     text,
  guardian_name   text,
  guardian_phone  text,
  guardian_dob    date,
  archived        boolean DEFAULT false,
  graduation_year text,
  leaving_reason  text,
  leaving_notes   text,
  entry_year      text,
  middle_name     text,
  school_id       uuid REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS student_year_enrolment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid REFERENCES students(id),
  class_id      uuid REFERENCES classes(id),
  academic_year text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  school_id     uuid REFERENCES schools(id),
  CONSTRAINT student_year_enrolment_unique UNIQUE (school_id, student_id, academic_year)
);

CREATE TABLE IF NOT EXISTS fees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid REFERENCES students(id),
  fee_type        text NOT NULL,
  amount          numeric NOT NULL DEFAULT 0,
  paid            numeric DEFAULT 0,
  due_date        date,
  receipt_no      text UNIQUE,
  created_at      timestamptz DEFAULT now(),
  academic_year   text,
  is_arrear       boolean DEFAULT false,
  arrear_from_year text,
  period          text,
  school_id       uuid REFERENCES schools(id),
  status          text DEFAULT 'Outstanding',
  balance         numeric,
  template_id     uuid,
  fee_period_id   uuid
);

CREATE TABLE IF NOT EXISTS fee_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        uuid NOT NULL REFERENCES schools(id),
  name             text NOT NULL,
  amount_per_period numeric NOT NULL DEFAULT 0,
  academic_year    text NOT NULL,
  created_by       uuid REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  class_ids        uuid[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS fee_periods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id),
  template_id  uuid NOT NULL REFERENCES fee_templates(id),
  label        text NOT NULL,
  period_date  date NOT NULL,
  academic_year text NOT NULL,
  created_by   uuid REFERENCES profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fees ADD CONSTRAINT fees_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES fee_templates(id);
ALTER TABLE fees ADD CONSTRAINT fees_fee_period_id_fkey
  FOREIGN KEY (fee_period_id) REFERENCES fee_periods(id);

CREATE TABLE IF NOT EXISTS payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id           uuid REFERENCES fees(id),
  student_id       uuid REFERENCES students(id),
  amount           numeric NOT NULL,
  receipt_no       text,
  recorded_by_id   uuid,
  recorded_by_name text,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  academic_year    text,
  school_id        uuid REFERENCES schools(id),
  fee_period_id    uuid REFERENCES fee_periods(id)
);

CREATE TABLE IF NOT EXISTS grades (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid REFERENCES students(id),
  subject_id   uuid REFERENCES subjects(id),
  classwork    numeric DEFAULT 0,
  homework     numeric DEFAULT 0,
  midsemester  numeric DEFAULT 0,
  final_exam   numeric DEFAULT 0,
  project      numeric DEFAULT 0,
  period       text NOT NULL,
  year         text,
  created_at   timestamptz DEFAULT now(),
  school_id    uuid REFERENCES schools(id),
  CONSTRAINT grades_student_id_subject_id_period_year_key UNIQUE (student_id, subject_id, period, year)
);

CREATE TABLE IF NOT EXISTS grade_releases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id),
  academic_year text NOT NULL,
  period        text NOT NULL,
  released_at   timestamptz DEFAULT now(),
  released_by   uuid REFERENCES profiles(id),
  CONSTRAINT grade_releases_school_id_academic_year_period_key UNIQUE (school_id, academic_year, period)
);

CREATE TABLE IF NOT EXISTS attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid REFERENCES students(id),
  class_id      uuid REFERENCES classes(id),
  date          date NOT NULL,
  status        text NOT NULL,
  marked_by     uuid REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now(),
  academic_year text,
  school_id     uuid REFERENCES schools(id),
  CONSTRAINT attendance_student_id_class_id_date_key UNIQUE (student_id, class_id, date)
);

CREATE TABLE IF NOT EXISTS behaviour (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid REFERENCES students(id),
  type             text NOT NULL,
  title            text NOT NULL,
  description      text,
  date             date DEFAULT CURRENT_DATE,
  recorded_by_id   uuid REFERENCES profiles(id),
  recorded_by_name text,
  created_at       timestamptz DEFAULT now(),
  academic_year    text,
  school_id        uuid REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  body           text NOT NULL,
  target_role    text DEFAULT 'all',
  active         boolean DEFAULT true,
  posted_by_id   uuid REFERENCES profiles(id),
  posted_by_name text,
  created_at     timestamptz DEFAULT now(),
  academic_year  text,
  school_id      uuid REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  user_id     uuid,
  user_name   text,
  module      text NOT NULL,
  action      text NOT NULL,
  description text,
  meta        jsonb,
  before_data jsonb,
  after_data  jsonb,
  school_id   uuid REFERENCES schools(id),
  ip_address  text
);

CREATE TABLE IF NOT EXISTS parent_students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id),
  parent_id  uuid NOT NULL REFERENCES profiles(id),
  student_id uuid NOT NULL REFERENCES students(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT parent_students_parent_id_student_id_key UNIQUE (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid REFERENCES schools(id),
  school_name  text,
  submitted_by text,
  user_email   text,
  type         text NOT NULL,
  description  text NOT NULL,
  page         text,
  status       text NOT NULL DEFAULT 'open',
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION my_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_active_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(locked, false) = false
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_ministry_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT role = 'ministry_admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION school_plan(p_school_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN cancelled_at IS NOT NULL
         AND now() > cancelled_at + (30 * interval '1 day')  THEN 'none'
    WHEN plan = 'trial'
         AND trial_ends_at IS NOT NULL
         AND now() <= trial_ends_at                           THEN 'pro'
    WHEN plan = 'trial'                                       THEN 'none'
    WHEN plan_expires_at IS NOT NULL
         AND now() > plan_expires_at                          THEN 'none'
    ELSE plan
  END
  FROM settings
  WHERE school_id = p_school_id;
$$;

-- ============================================================
-- RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role text;
  v_school_id uuid;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'teacher');
  IF v_role NOT IN ('superadmin','admin','classteacher','teacher','parent') THEN
    v_role := 'teacher';
  END IF;
  BEGIN
    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_school_id := NULL;
  END;
  INSERT INTO public.profiles (id, email, full_name, role, school_id, locked)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_school_id,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(NULLIF(new.raw_user_meta_data->>'full_name',''), public.profiles.full_name),
    role       = EXCLUDED.role,
    school_id  = COALESCE(EXCLUDED.school_id, public.profiles.school_id),
    locked     = false;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION generate_receipt_no(p_school_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_next int;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_no, '-', 2) AS int)), 0) + 1
  INTO v_next
  FROM payments
  WHERE school_id = p_school_id
    AND receipt_no ~ '^RCP-[0-9]+$';
  RETURN 'RCP-' || LPAD(v_next::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_student_id(p_school_id uuid, p_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_next int;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(student_id, '-', 2) AS int)), 0) + 1
  INTO v_next
  FROM students
  WHERE school_id = p_school_id
    AND student_id LIKE p_prefix || '-%'
    AND SPLIT_PART(student_id, '-', 2) ~ '^[0-9]+$';
  RETURN p_prefix || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION create_school_user(
  p_user_id   uuid,
  p_full_name text,
  p_email     text,
  p_role      text,
  p_school_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT school_id FROM profiles WHERE id = auth.uid()) != p_school_id THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'superadmin' THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  INSERT INTO profiles (id, full_name, email, role, school_id, locked)
  VALUES (p_user_id, p_full_name, p_email, p_role, p_school_id, false)
  ON CONFLICT (id) DO UPDATE
    SET full_name = p_full_name,
        email     = p_email,
        role      = p_role,
        school_id = p_school_id,
        locked    = false;
END;
$$;

CREATE OR REPLACE FUNCTION create_auth_user(
  p_email     text,
  p_password  text,
  p_full_name text,
  p_role      text,
  p_school_id uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'superadmin' THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF (SELECT school_id FROM profiles WHERE id = auth.uid()) != p_school_id THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    role, aud, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', gen_random_uuid()::text,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'authenticated', 'authenticated',
    now(), now(), '', '', '', ''
  ) RETURNING id INTO v_user_id;
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data, created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    now(), now(), now()
  );
  INSERT INTO public.profiles (id, email, full_name, role, school_id, locked, must_change_password)
  VALUES (v_user_id, p_email, p_full_name, p_role, p_school_id, false, true)
  ON CONFLICT (id) DO UPDATE SET
    full_name = p_full_name,
    role = p_role,
    school_id = p_school_id,
    locked = false,
    must_change_password = true;
  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_auth_user(
  p_user_id   uuid,
  p_email     text,
  p_full_name text,
  p_role      text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'superadmin' THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF (SELECT school_id FROM public.profiles WHERE id = auth.uid()) !=
     (SELECT school_id FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE auth.users SET
    email = p_email,
    raw_user_meta_data = jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email}', to_jsonb(p_email)
      ),
      '{full_name}', to_jsonb(p_full_name)
    ),
    updated_at = now()
  WHERE id = p_user_id;
  UPDATE auth.identities SET
    provider_id   = p_user_id::text,
    identity_data = jsonb_set(
      jsonb_set(
        COALESCE(identity_data, '{}'::jsonb),
        '{email}', to_jsonb(p_email)
      ),
      '{sub}', to_jsonb(p_user_id::text)
    ),
    updated_at = now()
  WHERE user_id = p_user_id;
  UPDATE public.profiles SET
    email     = p_email,
    full_name = p_full_name,
    role      = p_role
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION reset_user_password(
  p_user_id      uuid,
  p_new_password text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'superadmin' THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF (SELECT school_id FROM profiles WHERE id = auth.uid()) !=
     (SELECT school_id FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE auth.users SET
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = p_user_id;
  UPDATE public.profiles SET
    must_change_password = true
  WHERE id = p_user_id;
END;
$$;

-- admin_diagnostics_dismissed: lets a ministry admin snooze a flagged
-- diagnostic that's a false positive (e.g. a student legitimately mid-transfer
-- with no class yet) so it stops reappearing. target_id is null for
-- school-level checks (no single row to point at, e.g. "stuck rollover").
CREATE TABLE admin_diagnostics_dismissed (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  check_key     text NOT NULL,
  target_id     uuid,
  dismissed_by  uuid REFERENCES profiles(id),
  dismissed_by_name text,
  dismissed_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_diagnostics_dismissed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ministry admins manage dismissals" ON admin_diagnostics_dismissed FOR ALL USING (is_ministry_admin()) WITH CHECK (is_ministry_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_diagnostics_dismissed TO authenticated;

-- Diagnostics: the only "fix" narrow/unambiguous enough to automate blind --
-- an archived student should never still hold a class_id (the graduate code
-- path always nulls it), so seeing one is always a data-integrity bug, never
-- a legitimate state. Guarded so it's a no-op on anything not actually
-- archived, in case of a stale client-side diagnostic result.
CREATE OR REPLACE FUNCTION admin_fix_archived_student_class(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_ministry_admin() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE students SET class_id = NULL WHERE id = p_student_id AND archived = true;
END;
$$;

-- Called by the impersonated user themselves, right before the "Exit
-- Impersonation" sign-out, while their session is still live -- the action
-- string is hardcoded (never client-supplied) and scoped to the caller's own
-- school, so the worst-case misuse is a real, attributable user logging a
-- low-value row against their own school.
CREATE OR REPLACE FUNCTION log_impersonation_ended(p_detail text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_school_id   uuid;
  v_school_name text;
BEGIN
  SELECT school_id INTO v_school_id FROM profiles WHERE id = auth.uid();
  IF v_school_id IS NULL THEN
    RETURN;
  END IF;
  SELECT name INTO v_school_name FROM schools WHERE id = v_school_id;
  INSERT INTO admin_activity (school_id, school_name, action, detail)
  VALUES (v_school_id, v_school_name, 'Impersonation ended', p_detail);
END;
$$;

CREATE OR REPLACE FUNCTION rollover_academic_year(
  p_school_id uuid,
  p_old_year  text,
  p_new_year  text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_old_year = p_new_year THEN
    RAISE EXCEPTION 'old_year and new_year must be different';
  END IF;

  UPDATE grades        SET year          = p_old_year WHERE school_id = p_school_id AND year IS NULL;
  UPDATE attendance    SET academic_year = p_old_year WHERE school_id = p_school_id AND academic_year IS NULL;
  UPDATE fees          SET academic_year = p_old_year WHERE school_id = p_school_id AND academic_year IS NULL;
  UPDATE payments      SET academic_year = p_old_year WHERE school_id = p_school_id AND academic_year IS NULL;
  UPDATE behaviour     SET academic_year = p_old_year WHERE school_id = p_school_id AND academic_year IS NULL;
  UPDATE announcements SET academic_year = p_old_year WHERE school_id = p_school_id AND academic_year IS NULL;
  UPDATE students      SET entry_year    = p_old_year WHERE school_id = p_school_id AND entry_year IS NULL;

  INSERT INTO student_year_enrolment (school_id, student_id, class_id, academic_year)
  SELECT school_id, id, class_id, p_old_year
  FROM   students
  WHERE  school_id = p_school_id
    AND  NOT archived
    AND  class_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Arrears: carry forward what's still owed, reconciled against the actual
  -- payments ledger (fee.paid alone can drift from the real total -- same
  -- issue fixed on the app side via effectivePaid()). Duplicate guard is per
  -- original fee type, not just per student, so re-running this after a
  -- newly-discovered unpaid fee doesn't skip it just because the student
  -- already has some other arrear from that year.
  INSERT INTO fees (school_id, student_id, fee_type, amount, paid, academic_year, is_arrear, arrear_from_year)
  SELECT
    f.school_id, f.student_id,
    f.fee_type || ' (Arrears from ' || p_old_year || ')',
    f.amount - GREATEST(f.paid, COALESCE(ps.paid_sum, 0)), 0, p_new_year, true, p_old_year
  FROM fees f
  LEFT JOIN (
    SELECT fee_id, SUM(amount) AS paid_sum FROM payments GROUP BY fee_id
  ) ps ON ps.fee_id = f.id
  WHERE f.school_id     = p_school_id
    AND f.academic_year = p_old_year
    AND f.amount - GREATEST(f.paid, COALESCE(ps.paid_sum, 0)) > 0
    AND NOT COALESCE(f.is_arrear, false)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = f.student_id AND s.school_id = p_school_id AND NOT s.archived
    )
    AND NOT EXISTS (
      SELECT 1 FROM fees f2
      WHERE f2.school_id = p_school_id AND f2.academic_year = p_new_year
        AND f2.is_arrear = true AND f2.arrear_from_year = p_old_year
        AND f2.student_id = f.student_id
        AND f2.fee_type = f.fee_type || ' (Arrears from ' || p_old_year || ')'
      LIMIT 1
    );

  -- Recurring fee types carry forward so schools don't have to recreate
  -- Feeding/Transport/etc. every year. Periods do NOT carry forward -- each
  -- year starts with nothing charged yet. Skipped by name if already present
  -- under the new year, so this is safe to re-run.
  INSERT INTO fee_templates (school_id, name, amount_per_period, academic_year, created_by, class_ids)
  SELECT t.school_id, t.name, t.amount_per_period, p_new_year, t.created_by, t.class_ids
  FROM fee_templates t
  WHERE t.school_id = p_school_id
    AND t.academic_year = p_old_year
    AND NOT EXISTS (
      SELECT 1 FROM fee_templates t2
      WHERE t2.school_id = p_school_id AND t2.academic_year = p_new_year AND t2.name = t.name
    );

  INSERT INTO student_year_enrolment (school_id, student_id, class_id, academic_year)
  SELECT school_id, id, class_id, p_new_year
  FROM   students
  WHERE  school_id = p_school_id
    AND  NOT archived
    AND  class_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  UPDATE settings SET academic_year = p_new_year WHERE school_id = p_school_id;
END;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE schools               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_year_enrolment ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_periods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_releases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviour             ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback              ENABLE ROW LEVEL SECURITY;

-- schools
CREATE POLICY "School staff can read own school"     ON schools FOR SELECT USING (id = my_school_id());
CREATE POLICY "Superadmins insert schools"           ON schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Superadmins read own school"          ON schools FOR SELECT USING (true);
CREATE POLICY "Ministry admins can manage all schools" ON schools FOR ALL USING (is_ministry_admin()) WITH CHECK (is_ministry_admin());

-- profiles
CREATE POLICY "profiles_select"    ON profiles FOR SELECT USING (id = auth.uid() OR (school_id = my_school_id() AND is_active_user()));
CREATE POLICY "profiles_insert_sa" ON profiles FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = 'superadmin');
CREATE POLICY "profiles_update_sa" ON profiles FOR UPDATE USING (my_role() = 'superadmin' AND is_active_user()) WITH CHECK (my_role() = 'superadmin');
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_sa" ON profiles FOR DELETE USING (my_role() = 'superadmin' AND is_active_user());
CREATE POLICY "Admins can update profiles in their school" ON profiles FOR UPDATE
  USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['superadmin','admin']))
  WITH CHECK (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()));

-- settings
CREATE POLICY "settings_select"    ON settings FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "settings_parent_select" ON settings FOR SELECT USING (my_role() = 'parent' AND school_id = my_school_id());
CREATE POLICY "settings_insert_sa" ON settings FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = 'superadmin');
CREATE POLICY "settings_update_sa" ON settings FOR UPDATE USING (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user()) WITH CHECK (school_id = my_school_id());

-- classes
CREATE POLICY "classes_select"    ON classes FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "classes_parent_select" ON classes FOR SELECT USING (my_role() = 'parent' AND school_id = my_school_id());
CREATE POLICY "classes_insert_sa" ON classes FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user());
CREATE POLICY "classes_update_sa" ON classes FOR UPDATE USING (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "classes_delete_sa" ON classes FOR DELETE USING (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user());
CREATE POLICY "Ministry admins read all classes" ON classes FOR SELECT USING (is_ministry_admin());

-- subjects
CREATE POLICY "subjects_select"    ON subjects FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "subjects_parent_select" ON subjects FOR SELECT USING (my_role() = 'parent' AND school_id = my_school_id());
CREATE POLICY "subjects_insert_sa" ON subjects FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user());
CREATE POLICY "subjects_update_sa" ON subjects FOR UPDATE USING (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "subjects_delete_sa" ON subjects FOR DELETE USING (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user());

-- students
CREATE POLICY "students_select"        ON students FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "students_parent_select" ON students FOR SELECT USING (my_role() = 'parent' AND id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));
CREATE POLICY "students_insert"        ON students FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "students_update"        ON students FOR UPDATE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "students_delete"        ON students FOR DELETE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());

-- student_year_enrolment
CREATE POLICY "School staff read own enrolments"      ON student_year_enrolment FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "Admins manage enrolments"              ON student_year_enrolment FOR ALL USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "Ministry admins read all enrolments"   ON student_year_enrolment FOR SELECT USING (is_ministry_admin());

-- fees
CREATE POLICY "fees_select"        ON fees FOR SELECT USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "fees_parent_select" ON fees FOR SELECT USING (my_role() = 'parent' AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));
CREATE POLICY "fees_insert"        ON fees FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "fees_update"        ON fees FOR UPDATE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "fees_delete"        ON fees FOR DELETE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "Ministry admins read all fees" ON fees FOR SELECT USING (is_ministry_admin());

-- fee_templates
CREATE POLICY "school members read fee_templates" ON fee_templates FOR SELECT USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admins write fee_templates"        ON fee_templates FOR ALL USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['superadmin','admin']));

-- fee_periods
CREATE POLICY "school members read fee_periods" ON fee_periods FOR SELECT USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admins write fee_periods"        ON fee_periods FOR ALL USING (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['superadmin','admin']));

-- payments
CREATE POLICY "payments_select"        ON payments FOR SELECT USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "payments_parent_select" ON payments FOR SELECT USING (my_role() = 'parent' AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));
CREATE POLICY "payments_insert"        ON payments FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "payments_delete"        ON payments FOR DELETE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "Ministry admins read all payments" ON payments FOR SELECT USING (is_ministry_admin());

-- grades
CREATE POLICY "grades_select"        ON grades FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "grades_parent_select" ON grades FOR SELECT USING (my_role() = 'parent' AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()) AND EXISTS (SELECT 1 FROM grade_releases gr WHERE gr.school_id = grades.school_id AND gr.academic_year = grades.year AND gr.period = grades.period));
CREATE POLICY "grades_insert"        ON grades FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher','teacher']) AND is_active_user());
CREATE POLICY "grades_update"        ON grades FOR UPDATE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher','teacher']) AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "grades_delete"        ON grades FOR DELETE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher','teacher']) AND is_active_user());

-- grade_releases
CREATE POLICY "grade_releases_select" ON grade_releases FOR SELECT USING (school_id = my_school_id());
CREATE POLICY "grade_releases_insert" ON grade_releases FOR INSERT WITH CHECK (my_role() = ANY(ARRAY['superadmin','admin']) AND school_id = my_school_id());
CREATE POLICY "grade_releases_delete" ON grade_releases FOR DELETE USING (my_role() = ANY(ARRAY['superadmin','admin']) AND school_id = my_school_id());

-- attendance
CREATE POLICY "attendance_select"        ON attendance FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "attendance_parent_select" ON attendance FOR SELECT USING (my_role() = 'parent' AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid()));
CREATE POLICY "attendance_insert"        ON attendance FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher']) AND is_active_user());
CREATE POLICY "attendance_update"        ON attendance FOR UPDATE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher']) AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "attendance_delete"        ON attendance FOR DELETE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher']) AND is_active_user());

-- behaviour
CREATE POLICY "behaviour_select" ON behaviour FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "behaviour_insert" ON behaviour FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher']) AND is_active_user());
CREATE POLICY "behaviour_update" ON behaviour FOR UPDATE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher']) AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "behaviour_delete" ON behaviour FOR DELETE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin','classteacher']) AND is_active_user());
CREATE POLICY "plan_gate_behaviour" ON behaviour FOR ALL USING (is_active_user() AND school_plan(school_id) = ANY(ARRAY['basic','pro']));

-- announcements
CREATE POLICY "announcements_select"        ON announcements FOR SELECT USING (school_id = my_school_id() AND is_active_user());
CREATE POLICY "announcements_parent_select" ON announcements FOR SELECT USING (my_role() = 'parent' AND school_id = my_school_id());
CREATE POLICY "announcements_insert"        ON announcements FOR INSERT WITH CHECK (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "announcements_update"        ON announcements FOR UPDATE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user()) WITH CHECK (school_id = my_school_id());
CREATE POLICY "announcements_delete"        ON announcements FOR DELETE USING (school_id = my_school_id() AND my_role() = ANY(ARRAY['superadmin','admin']) AND is_active_user());
CREATE POLICY "plan_gate_announcements"     ON announcements FOR ALL USING (is_active_user() AND school_plan(school_id) = ANY(ARRAY['basic','pro']));

-- audit_logs
CREATE POLICY "audit_logs_select"    ON audit_logs FOR SELECT USING (school_id = my_school_id() AND my_role() = 'superadmin' AND is_active_user());
CREATE POLICY "audit_logs_insert"    ON audit_logs FOR INSERT WITH CHECK (school_id = my_school_id() AND is_active_user());
CREATE POLICY "block_anon_audit_logs" ON audit_logs AS RESTRICTIVE FOR SELECT TO anon USING (false);
CREATE POLICY "plan_gate_audit"      ON audit_logs FOR ALL USING (school_plan(school_id) = 'pro');

-- parent_students
CREATE POLICY "parent_students_select" ON parent_students FOR SELECT USING (parent_id = auth.uid() OR my_role() = ANY(ARRAY['superadmin','admin']));
CREATE POLICY "parent_students_insert" ON parent_students FOR INSERT WITH CHECK (my_role() = ANY(ARRAY['superadmin','admin']) AND school_id = my_school_id());
CREATE POLICY "parent_students_delete" ON parent_students FOR DELETE USING (my_role() = ANY(ARRAY['superadmin','admin']) AND school_id = my_school_id());

-- feedback
CREATE POLICY "Schools can insert feedback"  ON feedback FOR INSERT TO authenticated WITH CHECK (school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Service role reads all feedback" ON feedback FOR SELECT TO service_role USING (true);

