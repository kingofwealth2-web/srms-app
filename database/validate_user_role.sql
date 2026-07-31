-- ═══════════════════════════════════════════════════════════════════
-- F-008 (High): reject non-school roles in the user-management RPCs
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- create_auth_user / update_auth_user checked caller = superadmin + same school
-- but never validated p_role. A school superadmin could call them directly with
-- p_role = 'ministry_admin' and mint a vendor-level account (is_ministry_admin()
-- → cross-school access), breaking tenant isolation. These re-declarations add a
-- p_role whitelist right after the existing guards. Everything else is unchanged
-- from database/srms_migration.sql.
-- ═══════════════════════════════════════════════════════════════════

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
  -- F-008: only school-level roles may be assigned (never ministry_admin / unknown).
  IF p_role NOT IN ('superadmin','admin','classteacher','teacher','parent') THEN
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
  -- F-008: only school-level roles may be assigned (never ministry_admin / unknown).
  IF p_role NOT IN ('superadmin','admin','classteacher','teacher','parent') THEN
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
