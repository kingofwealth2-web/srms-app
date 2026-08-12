import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://srms-app.vercel.app',
  'https://srms-app-kingofwealth2-webs-projects.vercel.app',
  'https://srms-app-git-main-kingofwealth2-webs-projects.vercel.app',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

const corsHeadersFor = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  return {
    ...(allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { school_id, old_year, new_year } = await req.json()
  if (!school_id || !old_year || !new_year)
    return new Response(JSON.stringify({ error: 'school_id, old_year and new_year are required' }), { status: 400, headers: corsHeaders })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verify caller is superadmin using the service role client
  const { data: { user }, error: userErr } = await sb.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (userErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (profileErr || profile?.school_id !== school_id || profile?.role !== 'superadmin')
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })

  const { error } = await sb.rpc('rollover_academic_year', {
    p_school_id: school_id,
    p_old_year:  old_year,
    p_new_year:  new_year,
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
