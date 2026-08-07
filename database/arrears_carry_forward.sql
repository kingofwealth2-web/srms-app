-- ═══════════════════════════════════════════════════════════════════
-- F-011: unpaid arrears keep carrying forward every year until paid
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- rollover_academic_year previously skipped fees already marked is_arrear, so a
-- debt carried into one new year and then dropped off the active ledger at the
-- next rollover if still unpaid. Now arrears carry forward too, keeping their
-- ORIGINAL "Arrears from <year>" label and arrear_from_year (no chaining), and
-- only the remaining unpaid balance is carried. This re-declares the function
-- with that change; everything else is unchanged from srms_migration.sql.
--
-- (CREATE OR REPLACE keeps the existing REVOKE from F-010; the final grants below
--  re-assert it so the raw function stays callable only by the service role.)
-- ═══════════════════════════════════════════════════════════════════

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

  -- Let this function's cross-year writes through the past-year lock
  -- (F-014a). Scoped to this transaction; see database/lock_past_years.sql.
  PERFORM set_config('srms.year_rollover', 'on', true);

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

  -- Arrears carry forward every year until paid (F-011): an already-arrear fee
  -- keeps its ORIGINAL label and arrear_from_year (no chaining); only the
  -- remaining unpaid balance carries; duplicate guard is per student + final
  -- label + origin year, so re-running is safe and nothing double-counts.
  INSERT INTO fees (school_id, student_id, fee_type, amount, paid, academic_year, is_arrear, arrear_from_year)
  SELECT
    f.school_id, f.student_id,
    CASE WHEN COALESCE(f.is_arrear, false)
         THEN f.fee_type
         ELSE f.fee_type || ' (Arrears from ' || p_old_year || ')' END,
    f.amount - GREATEST(f.paid, COALESCE(ps.paid_sum, 0)), 0, p_new_year, true,
    CASE WHEN COALESCE(f.is_arrear, false) THEN f.arrear_from_year ELSE p_old_year END
  FROM fees f
  LEFT JOIN (
    SELECT fee_id, SUM(amount) AS paid_sum FROM payments GROUP BY fee_id
  ) ps ON ps.fee_id = f.id
  WHERE f.school_id     = p_school_id
    AND f.academic_year = p_old_year
    AND f.amount - GREATEST(f.paid, COALESCE(ps.paid_sum, 0)) > 0
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = f.student_id AND s.school_id = p_school_id AND NOT s.archived
    )
    AND NOT EXISTS (
      SELECT 1 FROM fees f2
      WHERE f2.school_id = p_school_id AND f2.academic_year = p_new_year
        AND f2.is_arrear = true
        AND f2.student_id = f.student_id
        AND f2.arrear_from_year = CASE WHEN COALESCE(f.is_arrear, false) THEN f.arrear_from_year ELSE p_old_year END
        AND f2.fee_type = CASE WHEN COALESCE(f.is_arrear, false) THEN f.fee_type ELSE f.fee_type || ' (Arrears from ' || p_old_year || ')' END
      LIMIT 1
    );

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

-- Keep the F-010 lockdown in place (only the service role, via the edge function).
REVOKE EXECUTE ON FUNCTION public.rollover_academic_year(uuid, text, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rollover_academic_year(uuid, text, text) TO service_role;
