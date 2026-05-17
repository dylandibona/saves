-- Household naming polish.
--
-- 1. Stop naming new households after the user's email. Use a clean
--    title-cased default derived from the local part — e.g. "Dylan's finds".
--    Users can rename via the settings UI.
--
-- 2. Rename existing email-named households so they feel like a place
--    rather than an address. Only touches households where name still
--    matches the creator's email (one-time backfill, no false hits).

-- ── Trigger update ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_household_id uuid;
  local_part       text;
  display          text;
BEGIN
  local_part := split_part(NEW.email, '@', 1);
  display    := initcap(regexp_replace(local_part, '[^a-zA-Z0-9]+', ' ', 'g'));
  IF display IS NULL OR display = '' THEN
    display := 'My';
  END IF;

  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.households (name, created_by)
  VALUES (display || '''s finds', NEW.id)
  RETURNING id INTO new_household_id;

  INSERT INTO public.household_members (household_id, user_id, role, joined_at)
  VALUES (new_household_id, NEW.id, 'owner', now());

  INSERT INTO public.recommenders (household_id, kind, display_name, platform)
  VALUES (new_household_id, 'self', 'You', 'self');

  RETURN NEW;
END;
$$;

-- ── Backfill existing email-named households ───────────────────────
-- Only touch households whose name matches their creator's email
-- exactly (won't disturb anyone who already renamed manually).
UPDATE public.households h
SET    name = initcap(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9]+', ' ', 'g')) || '''s finds'
FROM   public.users u
WHERE  h.created_by = u.id
  AND  h.name = u.email;
