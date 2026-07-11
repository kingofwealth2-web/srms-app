import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const { target_user_id } = await req.json()
  if (!target_user_id)
    return new Response(JSON.stringify({ error: 'target_user_id is required' }), { status: 400, headers: corsHeaders })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verify caller is a real, authenticated ministry_admin -- never trust a
  // client-supplied role.
  const { data: { user: caller }, error: callerErr } = await sb.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (callerErr || !caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const { data: callerProfile, error: callerProfileErr } = await sb
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', caller.id)
    .single()

  if (callerProfileErr || callerProfile?.role !== 'ministry_admin')
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })

  // Look up and validate the impersonation target.
  const { data: target, error: targetErr } = await sb
    .from('profiles')
    .select('id, full_name, email, role, school_id, locked')
    .eq('id', target_user_id)
    .single()

  if (targetErr || !target)
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders })
  if (target.role === 'ministry_admin')
    return new Response(JSON.stringify({ error: 'Cannot impersonate another ministry admin' }), { status: 403, headers: corsHeaders })
  if (!target.school_id)
    return new Response(JSON.stringify({ error: 'Target user has no school' }), { status: 400, headers: corsHeaders })
  if (target.locked)
    return new Response(JSON.stringify({ error: 'This user is locked -- unlock the account first' }), { status: 403, headers: corsHeaders })
  if (!target.email)
    return new Response(JSON.stringify({ error: 'Target user has no email on file' }), { status: 400, headers: corsHeaders })

  const { data: school } = await sb
    .from('schools')
    .select('name')
    .eq('id', target.school_id)
    .single()

  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: target.email,
  })
  if (linkErr || !link) return new Response(JSON.stringify({ error: linkErr?.message || 'Failed to generate session' }), { status: 500, headers: corsHeaders })

  const callerLabel = callerProfile.full_name || callerProfile.email || caller.id
  const targetLabel = target.full_name || target.email

  const { error: logErr } = await sb.from('admin_activity').insert({
    school_id: target.school_id,
    school_name: school?.name || '',
    action: 'Ministry admin viewed as user',
    detail: `${callerLabel} viewed as ${targetLabel} (${target.role})`,
  })
  if (logErr) console.error('Failed to log impersonation start:', logErr.message)

  return new Response(JSON.stringify({
    token_hash: link.properties?.hashed_token,
    target: {
      id: target.id,
      full_name: target.full_name,
      email: target.email,
      role: target.role,
      school_id: target.school_id,
      school_name: school?.name || '',
    },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
