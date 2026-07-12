import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Btn from '../components/Btn'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

const SEVERITY_COLOR = { critical: 'var(--rose)', warning: 'var(--amber)', info: 'var(--sky)' }

export default function AdminDiagnostics({ diagnosticIssues, diagnosticsLoading, reloadDiagnostics, openSchool, showToast, profile }) {
  const [busyKey, setBusyKey] = useState(null)
  // Local copy so dismiss/fix can remove a row immediately without waiting
  // on a full re-scan; re-synced whenever a fresh scan comes in from above.
  const [displayIssues, setDisplayIssues] = useState(diagnosticIssues)
  useEffect(() => { setDisplayIssues(diagnosticIssues) }, [diagnosticIssues])

  const issueKey = i => `${i.school_id}|${i.check_key}|${i.targetId || ''}`

  const dismiss = async (issue) => {
    setBusyKey(issueKey(issue))
    const { error } = await supabase.from('admin_diagnostics_dismissed').insert({
      school_id: issue.school_id, check_key: issue.check_key, target_id: issue.targetId,
      dismissed_by: profile?.id, dismissed_by_name: profile?.full_name || profile?.email,
    })
    setBusyKey(null)
    if (error) { showToast('Failed to dismiss: ' + error.message, 'error'); return }
    setDisplayIssues(prev => prev.filter(i => issueKey(i) !== issueKey(issue)))
  }

  const fixArchivedClass = async (issue) => {
    setBusyKey(issueKey(issue))
    const { error } = await supabase.rpc('admin_fix_archived_student_class', { p_student_id: issue.targetId })
    setBusyKey(null)
    if (error) { showToast('Failed to fix: ' + error.message, 'error'); return }
    showToast('Fixed -- class assignment cleared.')
    setDisplayIssues(prev => prev.filter(i => issueKey(i) !== issueKey(issue)))
  }

  const counts = {
    critical: displayIssues.filter(i => i.severity === 'critical').length,
    warning: displayIssues.filter(i => i.severity === 'warning').length,
    info: displayIssues.filter(i => i.severity === 'info').length,
  }

  return (
    <div>
      <PageHeader title='Diagnostics' sub='Data issues across every school, found automatically'>
        <Btn variant='ghost' onClick={reloadDiagnostics} disabled={diagnosticsLoading}>
          {diagnosticsLoading ? <><Spinner/> Scanning...</> : '↻ Re-scan'}
        </Btn>
      </PageHeader>

      {!diagnosticsLoading && displayIssues.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {counts.critical > 0 && <Badge color={SEVERITY_COLOR.critical}>{counts.critical} critical</Badge>}
          {counts.warning > 0 && <Badge color={SEVERITY_COLOR.warning}>{counts.warning} warning</Badge>}
          {counts.info > 0 && <Badge color={SEVERITY_COLOR.info}>{counts.info} info</Badge>}
        </div>
      )}

      {diagnosticsLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--mist3)' }}><Spinner/></div>
      ) : displayIssues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--mist3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13 }}>No issues found across any school.</div>
        </div>
      ) : (
        <Card style={{ padding: 0 }}>
          {displayIssues.map(issue => {
            const key = issueKey(issue)
            const busy = busyKey === key
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <Badge color={SEVERITY_COLOR[issue.severity]}>{issue.severity.toUpperCase()}</Badge>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{issue.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--mist3)' }}>· {issue.school_name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mist2)' }}>{issue.description}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {issue.check_key === 'archived_has_class' && (
                    <Btn size='sm' onClick={() => fixArchivedClass(issue)} disabled={busy}>{busy ? '...' : 'Fix'}</Btn>
                  )}
                  <Btn size='sm' variant='ghost' onClick={() => openSchool(issue.school_id)}>Open School →</Btn>
                  <Btn size='sm' variant='ghost' onClick={() => dismiss(issue)} disabled={busy}>Dismiss</Btn>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
