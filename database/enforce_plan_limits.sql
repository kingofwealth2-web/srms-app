-- ═══════════════════════════════════════════════════════════════════
-- F-014 (b): enforce plan student/user caps at the database level
--
-- Run once per database (STAGING FIRST, test thoroughly, then production).
-- Safe to re-run. Rollback is at the bottom of this file.
--
-- WHY
-- The Starter (80 students / 2 users) and Basic (500 / 10) caps were enforced
-- only in the UI (planHook.atStudentLimit / atUserLimit). A crafted API call
-- could bypass them and give a Starter school Basic-tier capacity for the
-- Starter price. This backstops the caps server-side:
--   * students  — a BEFORE INSERT/UPDATE trigger blocks a write that would push
--     the active (non-archived) student count over the plan cap.
--   * users     — create_auth_user rejects a new profile past the plan cap.
--
-- DESIGN NOTES
--  * Caps key off the RAW settings.plan (the tier actually paid for), NOT the
--    effective school_plan(). school_plan() collapses expired/grace states to
--    'none', which would wrongly cap a Basic school at 80 during its 7-day grace
--    window. Raw plan mirrors the app's own limit source (PLANS[planKey]) and so
--    never false-blocks an add the app would allow.
--  * Limits mirror src/modules/lib/constants.js PLANS exactly:
--        starter → 80 students / 2 users
--        basic   → 500 / 10
--        pro, trial, anything else → unlimited (NULL)
--    KEEP THESE IN SYNC with constants.js if the plans ever change.
--  * The student trigger only checks when a row becomes/stays ACTIVE, so a
--    school that downgraded while over the cap can still edit and archive its
--    existing students — it just can't add or re-enrol past the cap.
--  * Privileged roles (postgres migrations, service_role) bypass the student
--    trigger; only ordinary authenticated/anon API writes are capped. Schools
--    never hold a service_role key, so this doesn't weaken the backstop.
-- ═══════════════════════════════════════════════════════════════════

-- ── plan → cap lookups (raw plan) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION school_student_limit(p_school_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE plan
    WHEN 'starter' THEN 80
    WHEN 'basic'   THEN 500
    ELSE NULL   -- pro, trial, and anything else: unlimited
  END
  FROM settings WHERE school_id = p_school_id;
$$;

CREATE OR REPLACE FUNCTION school_user_limit(p_school_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE plan
    WHEN 'starter' THEN 2
    WHEN 'basic'   THEN 10
    ELSE NULL
  END
  FROM settings WHERE school_id = p_school_id;
$$;

-- ── student cap: trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_student_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  lim integer;
  cnt integer;
BEGIN
  -- Privileged contexts bypass (migrations, edge functions, admin tooling).
  IF current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin','authenticator') THEN
    RETURN NEW;
  END IF;

  -- Only guard rows that will be ACTIVE students.
  IF COALESCE(NEW.archived, false) THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only re-check when the row transitions INTO active (re-enrol);
  -- edits to an already-active student don't change the active count.
  IF TG_OP = 'UPDATE' AND NOT COALESCE(OLD.archived, false) THEN
    RETURN NEW;
  END IF;

  SELECT school_student_limit(NEW.school_id) INTO lim;
  IF lim IS NULL THEN
    RETURN NEW;   -- unlimited plan
  END IF;

  SELECT count(*) INTO cnt
  FROM students
  WHERE school_id = NEW.school_id
    AND NOT COALESCE(archived, false)
    AND id <> NEW.id;   -- exclude self (UPDATE re-enrol)

  IF cnt >= lim THEN
    RAISE EXCEPTION 'Your plan is limited to % active students. Upgrade to add more.', lim
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_limit ON students;
CREATE TRIGGER trg_student_limit BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION enforce_student_limit();

-- ── user cap: baked into create_auth_user ──────────────────────────────
-- Supersedes the definition in database/validate_user_role.sql — it KEEPS the
-- F-008 role whitelist and adds the plan user-cap check before any auth row is
-- created (so a rejected add never leaves an orphaned auth.users row).
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
  v_limit   integer;
  v_count   integer;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'superadmin' THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF (SELECT school_id FROM profiles WHERE id = auth.uid()) != p_school_id THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  -- F-008: only school-level roles may be assigned (never ministry_admin / unknown).
  IF p_role NOT IN ('superadmin','admin','classteacher','teacher','parent') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  -- F-014b: enforce the plan's user cap (counts all profiles, matching the app).
  SELECT school_user_limit(p_school_id) INTO v_limit;
  IF v_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.profiles WHERE school_id = p_school_id;
    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'User limit of % reached on your current plan. Upgrade to add more.', v_limit;
    END IF;
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

-- ── ROLLBACK ───────────────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_student_limit ON students;
-- DROP FUNCTION IF EXISTS enforce_student_limit();
-- DROP FUNCTION IF EXISTS school_student_limit(uuid);
-- DROP FUNCTION IF EXISTS school_user_limit(uuid);
-- (to drop the user cap, re-run database/validate_user_role.sql to restore
--  the create_auth_user definition without the cap check.)
