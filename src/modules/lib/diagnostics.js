import { supabase } from '../../supabase'
import { fetchAllRows, fullName } from './helpers'

// Each check returns an array of issues: {school_id, check_key, severity, title, description, targetId}
// targetId is null for school-level checks (no single row to point a Fix/dismiss at).

export const CHECK_LABELS = {
  stuck_rollover:         'Stuck year rollover',
  student_no_class:       'Student not assigned to a class',
  archived_has_class:     'Archived student still has a class',
  fee_paid_drift:         'Fee paid amount out of sync',
  fee_overpaid:           'Fee overpaid',
  orphaned_class_teacher: 'Class teacher no longer exists',
  orphaned_finance_record:'Fee/payment on a deleted student',
  school_locked_out:      'School has no working admin',
  duplicate_student:      'Possible duplicate student',
  student_no_contact:     'Student has no guardian contact',
  fee_template_gap:       'Recurring fees not set up for this year',
}

export async function runDiagnostics(schools) {
  const [
    { data: students }, { data: profiles }, { data: classes },
    { data: fees }, { data: payments }, { data: enrolments },
    { data: feeTemplates }, { data: dismissed },
  ] = await Promise.all([
    fetchAllRows(() => supabase.from('students').select('id,first_name,last_name,middle_name,dob,student_id,class_id,archived,guardian_phone,guardian_email,school_id')),
    fetchAllRows(() => supabase.from('profiles').select('id,full_name,role,locked,school_id')),
    fetchAllRows(() => supabase.from('classes').select('id,name,class_teacher_id,school_id')),
    fetchAllRows(() => supabase.from('fees').select('id,student_id,fee_type,amount,paid,academic_year,school_id')),
    fetchAllRows(() => supabase.from('payments').select('id,fee_id,amount,school_id')),
    fetchAllRows(() => supabase.from('student_year_enrolment').select('school_id,student_id,academic_year')),
    fetchAllRows(() => supabase.from('fee_templates').select('id,name,academic_year,school_id')),
    supabase.from('admin_diagnostics_dismissed').select('school_id,check_key,target_id'),
  ])

  const issues = []
  const push = (school_id, check_key, severity, targetId, description) => {
    issues.push({ school_id, check_key, severity, targetId: targetId ?? null, title: CHECK_LABELS[check_key], description })
  }

  const schoolOf = id => schools.find(s => s.id === id)

  // 1. Stuck rollover -- school's current year has non-archived students but
  // zero enrolment rows for that year (the forward-enrolment step never ran).
  for (const school of schools) {
    if (!school.academic_year) continue
    const activeStudents = (students || []).filter(s => s.school_id === school.id && !s.archived)
    if (activeStudents.length === 0) continue
    const hasCurrentYearEnrolment = (enrolments || []).some(e => e.school_id === school.id && e.academic_year === school.academic_year)
    if (!hasCurrentYearEnrolment) {
      push(school.id, 'stuck_rollover', 'critical', null, `${school.academic_year} has ${activeStudents.length} active student(s) but no enrolment records -- the year transition may not have completed.`)
    }
  }

  // 2. Non-archived student with no class
  for (const s of (students || [])) {
    if (!s.archived && !s.class_id) {
      push(s.school_id, 'student_no_class', 'warning', s.id, `${fullName(s)} (${s.student_id || 'no ID'}) isn't assigned to any class.`)
    }
  }

  // 3. Archived student still holding a class -- fixable
  for (const s of (students || [])) {
    if (s.archived && s.class_id) {
      push(s.school_id, 'archived_has_class', 'warning', s.id, `${fullName(s)} is archived but still shows a class assignment.`)
    }
  }

  // 4 & 5. Fee drift / overpaid
  const paymentsByFee = {}
  for (const p of (payments || [])) { (paymentsByFee[p.fee_id] ||= []).push(p) }
  for (const f of (fees || [])) {
    const feePayments = paymentsByFee[f.id] || []
    const sum = feePayments.reduce((a, p) => a + Number(p.amount || 0), 0)
    const raw = Number(f.paid || 0)
    if (Math.abs(raw - sum) > 0.01) {
      push(f.school_id, 'fee_paid_drift', 'warning', f.id, `${f.fee_type} (${f.academic_year}): recorded paid ₵${raw.toFixed(2)} doesn't match ₵${sum.toFixed(2)} in actual payments.`)
    }
    // Same max(raw, sum) rule as effectivePaid() -- reuses the `sum` already
    // computed above instead of re-scanning the full payments array again.
    const eff = Math.max(raw, sum)
    if (eff > Number(f.amount || 0) + 0.01) {
      push(f.school_id, 'fee_overpaid', 'warning', f.id, `${f.fee_type} (${f.academic_year}): ₵${eff.toFixed(2)} paid against a ₵${Number(f.amount).toFixed(2)} fee.`)
    }
  }

  // 6. Orphaned class teacher
  const profileIds = new Set((profiles || []).map(p => p.id))
  for (const c of (classes || [])) {
    if (c.class_teacher_id && !profileIds.has(c.class_teacher_id)) {
      push(c.school_id, 'orphaned_class_teacher', 'critical', c.id, `Class "${c.name}" points to a teacher account that no longer exists.`)
    }
  }

  // 7. Orphaned fee/payment (student deleted)
  const studentIds = new Set((students || []).map(s => s.id))
  for (const f of (fees || [])) {
    if (!studentIds.has(f.student_id)) {
      push(f.school_id, 'orphaned_finance_record', 'critical', f.id, `A "${f.fee_type}" fee references a student that no longer exists.`)
    }
  }

  // 8. School with zero working admin
  for (const school of schools) {
    const admins = (profiles || []).filter(p => p.school_id === school.id && (p.role === 'superadmin' || p.role === 'admin'))
    if (admins.length > 0 && admins.every(a => a.locked)) {
      push(school.id, 'school_locked_out', 'critical', null, `All ${admins.length} admin account(s) at this school are locked -- nobody there can log in.`)
    }
  }

  // 9. Duplicate students (same name + dob, same school)
  const seen = {}
  for (const s of (students || [])) {
    if (s.archived) continue
    const key = `${s.school_id}|${(s.first_name||'').toLowerCase()}|${(s.last_name||'').toLowerCase()}|${s.dob||''}`
    if (seen[key]) {
      push(s.school_id, 'duplicate_student', 'warning', s.id, `${fullName(s)} looks like a duplicate of an existing student (same name and date of birth).`)
    } else {
      seen[key] = true
    }
  }

  // 10. No guardian contact at all
  for (const s of (students || [])) {
    if (!s.archived && !s.guardian_phone && !s.guardian_email) {
      push(s.school_id, 'student_no_contact', 'info', s.id, `${fullName(s)} has no guardian phone or email on file.`)
    }
  }

  // 11. Fee templates not carried into the current year
  for (const school of schools) {
    if (!school.academic_year) continue
    const schoolTemplates = (feeTemplates || []).filter(t => t.school_id === school.id)
    if (schoolTemplates.length === 0) continue
    const priorYears = [...new Set(schoolTemplates.map(t => t.academic_year))].filter(y => y && y !== school.academic_year)
    const currentNames = new Set(schoolTemplates.filter(t => t.academic_year === school.academic_year).map(t => t.name))
    for (const y of priorYears) {
      const missing = schoolTemplates.filter(t => t.academic_year === y && !currentNames.has(t.name))
      for (const t of missing) {
        push(school.id, 'fee_template_gap', 'info', t.id, `"${t.name}" was charged in ${y} but hasn't been set up for ${school.academic_year}.`)
      }
    }
  }

  // Filter out dismissed issues
  const dismissedSet = new Set((dismissed || []).map(d => `${d.school_id}|${d.check_key}|${d.target_id || ''}`))
  const active = issues.filter(i => !dismissedSet.has(`${i.school_id}|${i.check_key}|${i.targetId || ''}`))

  const severityRank = { critical: 0, warning: 1, info: 2 }
  active.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])

  return active.map(i => ({ ...i, school_name: schoolOf(i.school_id)?.name || '—' }))
}
