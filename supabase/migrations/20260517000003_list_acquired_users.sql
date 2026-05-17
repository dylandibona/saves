-- list_acquired_users — admin view for the inviter ("you") so they can see
-- which of their app codes have been redeemed, by whom, and when each
-- tester's comp trial expires. Powers the "Tester accounts" panel on
-- /settings — used to organize the conversion moment when paid plans go live.
--
-- Returns one row per redeemed app code that the caller created.
-- Sorted by closest-to-expiry first so the user with the soonest ending
-- trial sits at the top of the list.

CREATE OR REPLACE FUNCTION public.list_acquired_users()
RETURNS TABLE (
  code                            text,
  redeemer_email                  text,
  redeemer_display_name           text,
  subscription_status             text,
  subscription_plan               text,
  subscription_current_period_end timestamptz,
  days_until_expiry               int,
  warning_level                   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ic.code,
    u.email                                                  AS redeemer_email,
    u.display_name                                           AS redeemer_display_name,
    u.subscription_status,
    u.subscription_plan,
    u.subscription_current_period_end,
    CASE
      WHEN u.subscription_current_period_end IS NULL THEN NULL
      ELSE GREATEST(0, (extract(epoch FROM (u.subscription_current_period_end - now())) / 86400)::int)
    END                                                      AS days_until_expiry,
    CASE
      WHEN u.subscription_status != 'trialing'                                          THEN 'inactive'
      WHEN u.subscription_current_period_end IS NULL                                    THEN 'unknown'
      WHEN u.subscription_current_period_end < now()                                    THEN 'expired'
      WHEN u.subscription_current_period_end < now() + INTERVAL '7 days'                THEN 'urgent'
      WHEN u.subscription_current_period_end < now() + INTERVAL '21 days'               THEN 'soon'
      ELSE                                                                                   'ok'
    END                                                      AS warning_level
  FROM public.invite_codes ic
  JOIN public.users u ON u.acquired_via_code = ic.code
  WHERE ic.created_by = v_user_id
    AND ic.kind       = 'app'
  ORDER BY u.subscription_current_period_end ASC NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_acquired_users() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_acquired_users() TO authenticated;
