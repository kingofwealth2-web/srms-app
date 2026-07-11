import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { getImpersonationState, clearImpersonationState, IMPERSONATION_EVENT } from '../lib/impersonation'

const BANNER_HEIGHT = 44

export default function ImpersonationBanner() {
  const [state, setState] = useState(() => getImpersonationState())
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const handler = () => setState(getImpersonationState())
    window.addEventListener(IMPERSONATION_EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(IMPERSONATION_EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  useEffect(() => {
    document.body.style.paddingTop = state ? `${BANNER_HEIGHT}px` : ''
    return () => { document.body.style.paddingTop = '' }
  }, [state])

  if (!state) return null

  const exit = async () => {
    setExiting(true)
    try {
      await supabase.rpc('log_impersonation_ended', {
        p_detail: `Session ended -- was viewing as ${state.targetUserName} (${state.targetUserRole}) at ${state.targetSchoolName}`,
      })
    } catch {
      // best-effort only -- never block sign-out on this
    }
    clearImpersonationState()
    await supabase.auth.signOut()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: BANNER_HEIGHT, zIndex: 99999,
      background: 'linear-gradient(90deg, #f06b7a, #fb9f3a)',
      color: '#1a0505', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 14, fontSize: 13, fontWeight: 700, fontFamily: "'Cabinet Grotesk', sans-serif",
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)', padding: '0 16px',
    }}>
      <span>
        ⚠ Viewing as <strong>{state.targetUserName}</strong> ({state.targetUserRole}) · {state.targetSchoolName} — impersonated by {state.actorName || state.actorEmail}
      </span>
      <button onClick={exit} disabled={exiting} style={{
        background: '#1a0505', color: '#fff', border: 'none', borderRadius: 8,
        padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: exiting ? 'default' : 'pointer',
        opacity: exiting ? 0.6 : 1,
      }}>
        {exiting ? 'Exiting…' : 'Exit Impersonation'}
      </button>
    </div>
  )
}
