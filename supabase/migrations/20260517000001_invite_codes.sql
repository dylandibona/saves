-- Invite codes — two kinds in one table.
--
--   kind = 'app'        Stranger gate. On redemption: caller keeps their
--                       auto-created solo household and is granted the
--                       plan named in plan_grant for 90 days.
--
--   kind = 'household'  Household-share link. On redemption: caller's
--                       auto-created solo household is removed and they
--                       join the inviter's household as a member.
--                       Inviter's plan is shared implicitly via household.
--
-- A household invite link is sufficient credential by itself — invitees
-- do NOT also need an app code. The link is the bypass for the beta gate.

-- ────────────────────────────────────────────────────────────────────
-- Table
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE public.invite_codes (
  code         text         PRIMARY KEY,
  kind         text         NOT NULL CHECK (kind IN ('app', 'household')),
  household_id uuid         REFERENCES public.households(id) ON DELETE CASCADE,
  -- Plan granted on redemption. For 'app' codes this drives the comp tier.
  -- For 'household' codes this is NULL — members inherit the household.
  plan_grant   text         CHECK (plan_grant IN ('personal', 'household_member')),
  role         text         NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  max_uses     int          NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  uses_count   int          NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  expires_at   timestamptz,
  created_by   uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notes        text,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  -- Shape integrity: app codes never carry a household; household codes always do.
  CONSTRAINT kind_household_consistency CHECK (
    (kind = 'app'       AND household_id IS NULL)
    OR (kind = 'household' AND household_id IS NOT NULL)
  )
);

CREATE INDEX idx_invite_codes_household  ON public.invite_codes (household_id)
  WHERE household_id IS NOT NULL;
CREATE INDEX idx_invite_codes_created_by ON public.invite_codes (created_by);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invite_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Data API grants (per the Oct 30 2026 Supabase policy change).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_codes TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- RLS — creators see/manage only their own codes
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY invite_codes_select_own ON public.invite_codes
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY invite_codes_insert_own ON public.invite_codes
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY invite_codes_update_own ON public.invite_codes
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY invite_codes_delete_own ON public.invite_codes
  FOR DELETE USING (created_by = auth.uid());

-- ────────────────────────────────────────────────────────────────────
-- Code generator — 10-char URL-safe alphabet without ambiguous glyphs
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- 30 chars, omits 0/O/1/I/L for legibility when typed
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result   text := '';
  i        int;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;
-- Called only from other SECURITY DEFINER functions or service-role.

-- ────────────────────────────────────────────────────────────────────
-- preview_invite_code — anon-callable, peeks at a code's metadata
-- so the login screen can render "Dylan is inviting you to Finds"
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.preview_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite         public.invite_codes%ROWTYPE;
  v_inviter_name   text;
  v_household_name text;
BEGIN
  SELECT * INTO v_invite FROM public.invite_codes WHERE code = upper(p_code);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  IF v_invite.uses_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'used');
  END IF;

  SELECT coalesce(nullif(display_name, ''), split_part(email, '@', 1))
    INTO v_inviter_name
    FROM public.users
    WHERE id = v_invite.created_by;

  IF v_invite.household_id IS NOT NULL THEN
    SELECT name INTO v_household_name
      FROM public.households
      WHERE id = v_invite.household_id;
  END IF;

  RETURN jsonb_build_object(
    'valid',          true,
    'kind',           v_invite.kind,
    'inviter_name',   v_inviter_name,
    'household_name', v_household_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preview_invite_code(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.preview_invite_code(text) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- redeem_invite_code — atomic redemption with row lock
-- ────────────────────────────────────────────────────────────────────

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

  -- Lock the invite row so concurrent redemptions can't over-allocate.
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

  -- ── Household kind ─────────────────────────────────────────────
  -- Move user from their solo household into the target household.
  -- Only valid before they've created any saves; otherwise the
  -- inviter must add them manually (deferred — future feature).
  IF v_invite.kind = 'household' THEN
    -- Are they already in the target household?
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

      -- Cascade removes household_members + recommenders for that solo household.
      DELETE FROM public.households WHERE id = v_old_household_id;
    END IF;

    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (v_invite.household_id, v_user_id, v_invite.role);

    -- Self recommender in the new household so DD/KL pills work for them.
    INSERT INTO public.recommenders (household_id, kind, display_name, platform)
    VALUES (v_invite.household_id, 'self', v_user_display, 'self')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Plan grant (both kinds, when specified) ────────────────────
  IF v_invite.plan_grant IS NOT NULL THEN
    UPDATE public.users
    SET
      subscription_plan               = v_invite.plan_grant,
      subscription_status             = 'trialing',
      subscription_current_period_end = now() + INTERVAL '90 days'
    WHERE id = v_user_id;
  END IF;

  -- ── Bump usage ────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────
-- Helper for the settings UI: mint a code in one shot, returning row.
-- Avoids needing the client to know about the generate_invite_code RPC.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_invite_code(
  p_kind         text,
  p_household_id uuid,
  p_plan_grant   text,
  p_role         text,
  p_max_uses     int,
  p_expires_at   timestamptz,
  p_notes        text
)
RETURNS public.invite_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code    text;
  v_row     public.invite_codes%ROWTYPE;
  v_attempt int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Household codes: caller must be an owner of that household.
  IF p_kind = 'household' THEN
    IF p_household_id IS NULL THEN
      RAISE EXCEPTION 'household_id required for household codes' USING ERRCODE = 'P0001';
    END IF;
    PERFORM 1 FROM public.household_members
      WHERE household_id = p_household_id
        AND user_id      = v_user_id
        AND role         = 'owner';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'only household owners can mint household invites' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Generate a unique code with up to 5 retries on conflict.
  LOOP
    v_attempt := v_attempt + 1;
    v_code := public.generate_invite_code();
    BEGIN
      INSERT INTO public.invite_codes (
        code, kind, household_id, plan_grant, role,
        max_uses, expires_at, created_by, notes
      ) VALUES (
        v_code,
        p_kind,
        CASE WHEN p_kind = 'household' THEN p_household_id ELSE NULL END,
        p_plan_grant,
        coalesce(p_role, 'member'),
        coalesce(p_max_uses, 1),
        p_expires_at,
        v_user_id,
        p_notes
      )
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 5 THEN RAISE; END IF;
      -- Try again with a new random code.
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_invite_code(text, uuid, text, text, int, timestamptz, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_invite_code(text, uuid, text, text, int, timestamptz, text) TO authenticated;

COMMENT ON TABLE public.invite_codes IS
  'Two kinds in one table: app codes (stranger gate, grant comp plan) and '
  'household codes (share an existing household). See migration header for the '
  'redemption semantics and the household-merge invariants.';
