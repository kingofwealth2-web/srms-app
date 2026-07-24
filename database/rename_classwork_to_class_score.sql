-- ═══════════════════════════════════════════════════════════════════
-- Rename the "Classwork" grade component label to "Class Score"
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- Each school stores its own grade_components array in its settings row, so
-- the code default alone only reaches NEW schools. This updates the label on
-- existing schools. Only the display label changes -- the component key stays
-- 'classwork', which is the grades-table column name, so no scores move.
--
-- The WHERE clause limits this to schools whose classwork component is still
-- labelled exactly "Classwork" (the old default). A school that renamed it to
-- something of its own is left alone.
-- ═══════════════════════════════════════════════════════════════════

update public.settings
set grade_components = (
  select jsonb_agg(
    case
      when elem->>'key' = 'classwork' and elem->>'label' = 'Classwork'
        then jsonb_set(elem, '{label}', '"Class Score"')
      else elem
    end
    order by ord
  )
  from jsonb_array_elements(grade_components) with ordinality as t(elem, ord)
)
where grade_components @> '[{"key":"classwork","label":"Classwork"}]';
