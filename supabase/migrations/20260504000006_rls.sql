-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommenders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merge_proposals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_syncs         ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Helper: membership check used by household-scoped policies.
-- SECURITY DEFINER bypasses RLS on household_members so the
-- function itself can read it without recursion.
-- STABLE allows the planner to inline / cache within a query.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_household_member(hid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = hid
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- users: own row only
-- ------------------------------------------------------------

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- ------------------------------------------------------------
-- households: members can read; only owner can update
-- ------------------------------------------------------------

CREATE POLICY "households_select_member" ON public.households
  FOR SELECT USING (public.is_household_member(id));

CREATE POLICY "households_update_owner" ON public.households
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ------------------------------------------------------------
-- household_members: members can read;
-- owners can add or remove other members
-- ------------------------------------------------------------

CREATE POLICY "household_members_select" ON public.household_members
  FOR SELECT USING (public.is_household_member(household_id));

CREATE POLICY "household_members_insert_owner" ON public.household_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'owner'
    )
  );

CREATE POLICY "household_members_delete_owner" ON public.household_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'owner'
    )
  );

-- ------------------------------------------------------------
-- sources: globally readable; no user writes (managed by system)
-- ------------------------------------------------------------

CREATE POLICY "sources_select_all" ON public.sources
  FOR SELECT USING (true);

-- ------------------------------------------------------------
-- recommenders: household-scoped read/write
-- ------------------------------------------------------------

CREATE POLICY "recommenders_select" ON public.recommenders
  FOR SELECT USING (public.is_household_member(household_id));

CREATE POLICY "recommenders_insert" ON public.recommenders
  FOR INSERT WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "recommenders_update" ON public.recommenders
  FOR UPDATE USING (public.is_household_member(household_id));

CREATE POLICY "recommenders_delete" ON public.recommenders
  FOR DELETE USING (public.is_household_member(household_id));

-- ------------------------------------------------------------
-- saves: household-scoped read/write
-- ------------------------------------------------------------

CREATE POLICY "saves_select" ON public.saves
  FOR SELECT USING (public.is_household_member(household_id));

CREATE POLICY "saves_insert" ON public.saves
  FOR INSERT WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "saves_update" ON public.saves
  FOR UPDATE USING (public.is_household_member(household_id));

CREATE POLICY "saves_delete" ON public.saves
  FOR DELETE USING (public.is_household_member(household_id));

-- ------------------------------------------------------------
-- captures: access via parent save's household
-- ------------------------------------------------------------

CREATE POLICY "captures_select" ON public.captures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "captures_insert" ON public.captures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "captures_update" ON public.captures
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "captures_delete" ON public.captures
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- variations: access via parent save's household
-- ------------------------------------------------------------

CREATE POLICY "variations_select" ON public.variations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "variations_insert" ON public.variations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "variations_update" ON public.variations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- tags: household-scoped read/write
-- ------------------------------------------------------------

CREATE POLICY "tags_select" ON public.tags
  FOR SELECT USING (public.is_household_member(household_id));

CREATE POLICY "tags_insert" ON public.tags
  FOR INSERT WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "tags_update" ON public.tags
  FOR UPDATE USING (public.is_household_member(household_id));

CREATE POLICY "tags_delete" ON public.tags
  FOR DELETE USING (public.is_household_member(household_id));

-- ------------------------------------------------------------
-- save_tags: access via parent save's household
-- ------------------------------------------------------------

CREATE POLICY "save_tags_select" ON public.save_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "save_tags_insert" ON public.save_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "save_tags_delete" ON public.save_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      INNER JOIN public.household_members hm ON hm.household_id = s.household_id
      WHERE s.id = save_id AND hm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- inbound_messages: own rows only
-- ------------------------------------------------------------

CREATE POLICY "inbound_messages_select" ON public.inbound_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "inbound_messages_insert" ON public.inbound_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbound_messages_update" ON public.inbound_messages
  FOR UPDATE USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- merge_proposals: household-scoped read; members can update
-- (to record their merge/separate decision)
-- ------------------------------------------------------------

CREATE POLICY "merge_proposals_select" ON public.merge_proposals
  FOR SELECT USING (public.is_household_member(household_id));

CREATE POLICY "merge_proposals_update" ON public.merge_proposals
  FOR UPDATE USING (public.is_household_member(household_id));

-- ------------------------------------------------------------
-- map_syncs: own rows only
-- ------------------------------------------------------------

CREATE POLICY "map_syncs_select" ON public.map_syncs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "map_syncs_insert" ON public.map_syncs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "map_syncs_update" ON public.map_syncs
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "map_syncs_delete" ON public.map_syncs
  FOR DELETE USING (user_id = auth.uid());
