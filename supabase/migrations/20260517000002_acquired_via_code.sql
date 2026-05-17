-- Track which invite code (if any) a user signed up through, so the
-- "early tester" cohort can be identified later — e.g. when paid plans
-- activate and we want to issue them a fresh discount code as thanks.
--
-- Only stamped for kind='app' codes. Household joins are not relevant
-- for cohort tracking; those people are inside an existing household.

ALTER TABLE public.users
  ADD COLUMN acquired_via_code text;

CREATE INDEX idx_users_acquired_via_code
  ON public.users (acquired_via_code)
  WHERE acquired_via_code IS NOT NULL;

-- Replace redeem_invite_code so app-code redemptions stamp the user.
CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id          uuid := auth.uid();
  v_user_email       text;
  v_user_display     text;
  v_invite           public.invite_codes%ROWTYPE;
  v_old_household_id uuid;
  v_save_count       int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT email, coalesce(nullif(display_name, ''), split_part(email, '@', 1))
    INTO v_user_email, v_user_display
    FROM public.users
    WHERE id = v_user_id;

  SELECT * INTO v_invite
    FROM public.invite_codes
    WHERE code = upper(p_code)
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid code' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'code expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.uses_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'code already used' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.kind = 'household' THEN
    PERFORM 1 FROM public.household_members
      WHERE household_id = v_invite.household_id AND user_id = v_user_id;
    IF FOUND THEN
      RAISE EXCEPTION 'already a member of this household' USING ERRCODE = 'P0001';
    END IF;

    SELECT household_id INTO v_old_household_id
      FROM public.household_members
      WHERE user_id = v_user_id
      ORDER BY joined_at ASC
      LIMIT 1;

    IF v_old_household_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_save_count
        FROM public.saves
        WHERE household_id = v_old_household_id;

      IF v_save_count > 0 THEN
        RAISE EXCEPTION 'cannot join a household after creating saves; ask the household owner to add you manually'
          USING ERRCODE = 'P0001';
      END IF;

      DELETE FROM public.households WHERE id = v_old_household_id;
    END IF;

    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (v_invite.household_id, v_user_id, v_invite.role);

    INSERT INTO public.recommenders (household_id, kind, display_name, platform)
    VALUES (v_invite.household_id, 'self', v_user_display, 'self')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Plan grant + (for app codes) cohort tag for later targeting.
  IF v_invite.plan_grant IS NOT NULL THEN
    UPDATE public.users
    SET
      subscription_plan               = v_invite.plan_grant,
      subscription_status             = 'trialing',
      subscription_current_period_end = now() + INTERVAL '90 days',
      acquired_via_code               = CASE
        WHEN v_invite.kind = 'app'
        THEN v_invite.code
        ELSE acquired_via_code  -- preserve existing value for household redemptions
      END
    WHERE id = v_user_id;
  ELSIF v_invite.kind = 'app' THEN
    -- App code without plan grant — still tag the cohort.
    UPDATE public.users
    SET acquired_via_code = v_invite.code
    WHERE id = v_user_id;
  END IF;

  UPDATE public.invite_codes
  SET uses_count = uses_count + 1, updated_at = now()
  WHERE code = v_invite.code;

  RETURN jsonb_build_object(
    'kind',         v_invite.kind,
    'household_id', v_invite.household_id,
    'plan_grant',   v_invite.plan_grant
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;

COMMENT ON COLUMN public.users.acquired_via_code IS
  'For app-kind invite codes: the code this user redeemed at signup. '
  'Identifies the early-tester cohort for future discount/migration outreach. '
  'NULL for users who signed up before invite gating, or who joined a household.';
