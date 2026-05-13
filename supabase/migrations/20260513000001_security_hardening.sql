-- Address actionable items from the Supabase Security Advisor (2026-05-13).
-- See docs/session-notes-2026-05-13.md for full triage.
--
-- Items addressed:
--   1. rls_enabled_no_policy on public.stripe_events     (INFO; doc-only)
--   2. function_search_path_mutable on 6 of our functions (WARN)
--   3. anon/authenticated_security_definer_function_executable
--      on our trigger + RPC functions                    (WARN)
--
-- Items intentionally NOT addressed:
--   - spatial_ref_sys (ERROR): owned by supabase_admin, can't ALTER from
--     user-space. PostGIS reference data, no user info — informational
--     false positive. Would require moving PostGIS to another schema,
--     which is destructive.
--   - PostGIS st_estimatedextent functions  (ship with PostGIS)
--   - extension_in_public (postgis, pg_trgm) (destructive to move)
--   - auth_leaked_password_protection        (dashboard toggle)

-- ────────────────────────────────────────────────────────────────────
-- 1. stripe_events — document the default-deny posture
-- ────────────────────────────────────────────────────────────────────
-- Service-role bypasses RLS, so the webhook handler writes here
-- unimpeded. authenticated and anon legitimately can never touch
-- this table. Default deny IS the intended posture; document so the
-- next reader understands the lint is a false positive.
COMMENT ON TABLE public.stripe_events IS
  'Stripe webhook event log. RLS enabled with no policies on purpose: '
  'service-role-only access via /api/stripe-webhook. '
  'Default-deny for anon and authenticated is intentional.';

-- ────────────────────────────────────────────────────────────────────
-- 2. Pin search_path on all functions we own
-- ────────────────────────────────────────────────────────────────────
-- Empty search_path forces fully-qualified references inside the
-- function body. Prevents search-path hijack attacks where a
-- malicious schema with a same-named object could shadow ours.
ALTER FUNCTION public.handle_new_user()           SET search_path = '';
ALTER FUNCTION public.is_household_member(uuid)   SET search_path = '';
ALTER FUNCTION public.set_updated_at()            SET search_path = '';
ALTER FUNCTION public.expire_merge_proposals()    SET search_path = '';
ALTER FUNCTION public.update_save_capture_stats() SET search_path = '';
ALTER FUNCTION public.generate_share_token()      SET search_path = '';

-- ────────────────────────────────────────────────────────────────────
-- 3. Revoke EXECUTE on SECURITY DEFINER functions
-- ────────────────────────────────────────────────────────────────────
-- Trigger functions and event-trigger functions are NEVER meant to be
-- called via PostgREST. Trigger execution does not check EXECUTE
-- permission, so revoking does not break the trigger pathway.

-- Trigger functions: revoke from everyone exposed via REST.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_merge_proposals()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_save_capture_stats()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;

-- is_household_member is called by RLS policies inside SQL. Policy
-- evaluation routes through PostgREST's EXECUTE grant check, so we
-- must keep authenticated EXECUTE to avoid breaking every household-
-- scoped SELECT. Revoke anon — they have no auth.uid() anyway.
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid)
  FROM PUBLIC, anon;

-- generate_share_token writes the calling user's share token. Anon
-- cannot meaningfully use it (no auth.uid()); revoke for defense in
-- depth. Keep authenticated EXECUTE — settings/actions.ts calls it
-- as a Server Action from the user's session.
REVOKE EXECUTE ON FUNCTION public.generate_share_token()
  FROM PUBLIC, anon;
