-- ═══════════════════════════════════════════════════════════════════
-- F-010 (Critical): lock down rollover_academic_year
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- rollover_academic_year is SECURITY DEFINER and takes a client-supplied
-- p_school_id, but has no internal caller check and was never REVOKEd, so any
-- authenticated (or anon) role could call it directly via supabase.rpc() and
-- force a destructive year rollover on ANY school -- bypassing the
-- start-new-year edge function that is supposed to gate it.
--
-- The only legitimate caller is that edge function, which runs as the SERVICE
-- ROLE. So we simply remove direct execute from the client roles. We do NOT add
-- an auth.uid() guard inside the function -- the service role has no auth.uid(),
-- so such a guard would break the legitimate path.
-- ═══════════════════════════════════════════════════════════════════

revoke execute on function public.rollover_academic_year(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.rollover_academic_year(uuid, text, text) to service_role;
