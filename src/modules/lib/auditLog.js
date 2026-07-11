import { supabase } from '../../supabase'
import { getImpersonationState } from './impersonation'

export const auditLog = async (
  profile, module, action, description,
  meta = {}, before_data = null, after_data = null
) => {
  try {
    // If a ministry admin is currently impersonating this session, tag the
    // entry so the school's own audit trail doesn't silently misattribute
    // the action to the real user.
    const impersonation = getImpersonationState()
    const userName = profile?.full_name || profile?.email || 'Unknown'

    const { error } = await supabase.from('audit_logs').insert({
      school_id:   profile?.school_id ?? null,
      user_id:     profile?.id,
      user_name:   impersonation ? `${userName} (via Ministry Admin impersonation)` : userName,
      module,
      action,
      description,
      meta:        impersonation ? { ...meta, impersonated: true, impersonated_by: impersonation.actorEmail } : meta,
      before_data,
      after_data,
    })
    if (error) {
      console.error('[auditLog] Failed to write audit entry:', error.message, { module, action, description })
    }
  } catch (e) {
    console.error('[auditLog] Unexpected error:', e)
  }
}