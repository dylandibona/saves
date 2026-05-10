-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- updated_at maintenance
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recommenders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.saves
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.variations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.save_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inbound_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.merge_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.map_syncs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- Capture stats: keeps saves.capture_count and last_captured_at
-- in sync via INSERT trigger on captures.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_save_capture_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.saves
  SET
    capture_count    = (SELECT COUNT(*) FROM public.captures WHERE save_id = NEW.save_id),
    last_captured_at = NEW.captured_at,
    updated_at       = now()
  WHERE id = NEW.save_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_capture_insert
  AFTER INSERT ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.update_save_capture_stats();

-- ------------------------------------------------------------
-- Signup handler
-- Fires on auth.users INSERT. Creates:
--   1. public.users row  (capture_email left NULL — set by app after signup)
--   2. households row
--   3. household_members row (role: owner)
--   4. recommenders row (kind: self)
--
-- public.users is created before households because
-- households.created_by references public.users.id.
--
-- capture_email is NOT generated here. The application signup
-- callback reads INBOUND_EMAIL_DOMAIN from env and writes it via
-- a server action, keeping the domain out of the database layer.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id uuid;
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.households (name, created_by)
  VALUES (NEW.email, NEW.id)
  RETURNING id INTO new_household_id;

  INSERT INTO public.household_members (household_id, user_id, role, joined_at)
  VALUES (new_household_id, NEW.id, 'owner', now());

  INSERT INTO public.recommenders (household_id, kind, display_name, platform)
  VALUES (new_household_id, 'self', 'You', 'self');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- Merge proposal expiration
-- Sets status = 'expired' for pending proposals older than 48h.
-- Call this from a scheduled Supabase Edge Function or pg_cron job.
-- In Sprint 1, can also be called lazily before rendering the feed.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expire_merge_proposals()
RETURNS void AS $$
BEGIN
  UPDATE public.merge_proposals
  SET status     = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;
