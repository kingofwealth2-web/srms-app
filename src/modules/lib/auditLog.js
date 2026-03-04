import { supabase } from '../../supabase'

export const auditLog = async (
  profile, module, action, description,
  meta = {}, before_data = null, after_data = null
) => {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      school_id:   profile?.school_id ?? null,
      user_id:     profile?.id,
      user_name:   profile?.full_name || profile?.email || 'Unknown',
      module,
      action,
      description,
      meta,
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