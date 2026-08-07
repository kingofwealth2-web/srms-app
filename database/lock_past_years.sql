-- ═══════════════════════════════════════════════════════════════════
-- F-014 (a): past academic years are read-only at the database level
--
-- Run once per database (STAGING FIRST, test thoroughly, then production).
-- Safe to re-run. Rollback is at the bottom of this file (one DROP each).
--
-- WHY
-- The app hides past years behind the read-only Year Switcher, but that is a
-- UI guard only: a crafted API call (or a stale tab) could still INSERT/UPDATE
-- grades, fees, attendance, etc. against an archived year. This adds a BEFORE
-- INSERT/UPDATE trigger that rejects any write whose year <> the school's
-- current settings.academic_year, so archived years are immutable through the
-- normal (authenticated) API.
--
-- SAFETY / WHAT IS EXEMPTED (so legitimate flows never break):
--   * Privileged roles bypass entirely — migrations run as `postgres`, edge
--     functions and the SECURITY DEFINER rollover run as `postgres`/
--     `service_role`. Only ordinary `authenticated`/`anon` API writes are checked.
--   * The year-rollover GUC (`srms.year_rollover=on`) bypasses too, so the
--     rollover's own cross-year writes always pass (belt-and-suspenders).
--   * NULL year values pass (the rollover back-fills them; some inserts set the
--     year afterwards).
--   * If the school has no current year set, nothing is blocked.
--   * Dash/slash is normalised: settings stores "2024-2025" on a fresh school
--     but "2027/2028" after a rollover, while records always use slash form.
--     Both sides are normalised so the current year always compares equal.
--
-- NOT locked (intentionally): fee_templates, fee_periods, grade_releases — these
-- are per-year *configuration*, low value to tamper with, and locking them could
-- interfere with legitimate setup flows.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enforce_current_academic_year()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ycol text := TG_ARGV[0];   -- name of the year column on this table
  yval text;
  cur  text;
BEGIN
  -- 1. Privileged contexts bypass (migrations, edge functions, rollover).
  IF current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin','authenticator') THEN
    RETURN NEW;
  END IF;

  -- 2. Explicit rollover bypass (in case the rollover ever runs as a non-postgres owner).
  IF current_setting('srms.year_rollover', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- 3. Read the row's year value (column name differs: grades.year vs academic_year).
  EXECUTE format('SELECT ($1).%I::text', ycol) INTO yval USING NEW;
  IF yval IS NULL THEN
    RETURN NEW;   -- unset writes are back-filled to the current year later
  END IF;

  -- 4. Determine the school's current year; don't block if it's unknown.
  SELECT academic_year INTO cur FROM settings WHERE school_id = NEW.school_id;
  IF cur IS NULL THEN
    RETURN NEW;
  END IF;

  -- 5. Compare, normalising dash/slash so "2024-2025" and "2024/2025" match.
  IF replace(yval,'-','/') <> replace(cur,'-','/') THEN
    RAISE EXCEPTION 'Academic year % is archived and read-only (current year is %). Switch to the current year to make changes.', yval, cur
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to each year-scoped record table.
-- Second arg is the year column name on that table.
DROP TRIGGER IF EXISTS trg_year_lock ON grades;
CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('year');

DROP TRIGGER IF EXISTS trg_year_lock ON attendance;
CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('academic_year');

DROP TRIGGER IF EXISTS trg_year_lock ON fees;
CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON fees
  FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('academic_year');

DROP TRIGGER IF EXISTS trg_year_lock ON payments;
CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('academic_year');

DROP TRIGGER IF EXISTS trg_year_lock ON behaviour;
CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON behaviour
  FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('academic_year');

DROP TRIGGER IF EXISTS trg_year_lock ON announcements;
CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('academic_year');

DROP TRIGGER IF EXISTS trg_year_lock ON student_year_enrolment;
CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON student_year_enrolment
  FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('academic_year');

-- attendance_opening_balances is created outside srms_migration.sql; guard it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'attendance_opening_balances') THEN
    DROP TRIGGER IF EXISTS trg_year_lock ON attendance_opening_balances;
    CREATE TRIGGER trg_year_lock BEFORE INSERT OR UPDATE ON attendance_opening_balances
      FOR EACH ROW EXECUTE FUNCTION enforce_current_academic_year('academic_year');
  END IF;
END $$;

-- ── ROLLBACK (run these to fully remove the lock) ──────────────────────
-- DROP TRIGGER IF EXISTS trg_year_lock ON grades;
-- DROP TRIGGER IF EXISTS trg_year_lock ON attendance;
-- DROP TRIGGER IF EXISTS trg_year_lock ON fees;
-- DROP TRIGGER IF EXISTS trg_year_lock ON payments;
-- DROP TRIGGER IF EXISTS trg_year_lock ON behaviour;
-- DROP TRIGGER IF EXISTS trg_year_lock ON announcements;
-- DROP TRIGGER IF EXISTS trg_year_lock ON student_year_enrolment;
-- DROP TRIGGER IF EXISTS trg_year_lock ON attendance_opening_balances;
-- DROP FUNCTION IF EXISTS enforce_current_academic_year();
