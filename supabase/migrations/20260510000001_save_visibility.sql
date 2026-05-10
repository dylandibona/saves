-- Save visibility: shared with household OR private to the user who created it.
--
-- Default is 'household' (existing behavior — preserves all current saves).
-- 'private' saves are visible only to the user whose id is in created_by.
--
-- created_by is also added so we know who originated each save (separate from
-- captures, which are the save events). Backfilled from the earliest capture.

------------------------------------------------------------
-- 1. Visibility enum + columns
------------------------------------------------------------

CREATE TYPE public.save_visibility AS ENUM ('household', 'private');

ALTER TABLE public.saves
  ADD COLUMN visibility public.save_visibility NOT NULL DEFAULT 'household',
  ADD COLUMN created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

------------------------------------------------------------
-- 2. Backfill created_by from earliest capture per save
------------------------------------------------------------

UPDATE public.saves s
SET created_by = sub.user_id
FROM (
  SELECT DISTINCT ON (save_id)
    save_id,
    user_id
  FROM public.captures
  ORDER BY save_id, captured_at ASC
) sub
WHERE s.id = sub.save_id
  AND s.created_by IS NULL;

------------------------------------------------------------
-- 3. Index — supports the visibility-aware RLS check
------------------------------------------------------------

CREATE INDEX idx_saves_visibility_created_by
  ON public.saves (visibility, created_by)
  WHERE status = 'active';

------------------------------------------------------------
-- 4. Update the saves SELECT policy to respect visibility
--    Other policies (insert/update/delete) stay unchanged — household
--    members can still mutate any save in their household; the visibility
--    only gates READ access.
------------------------------------------------------------

DROP POLICY IF EXISTS "saves_select" ON public.saves;

CREATE POLICY "saves_select" ON public.saves
  FOR SELECT
  USING (
    public.is_household_member(household_id)
    AND (
      visibility = 'household'
      OR created_by = auth.uid()
    )
  );

------------------------------------------------------------
-- 5. Update the captures SELECT policy so private-save captures
--    only show to the save creator. Captures inherit through saves.
------------------------------------------------------------

DROP POLICY IF EXISTS "captures_select" ON public.captures;

CREATE POLICY "captures_select" ON public.captures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      WHERE s.id = captures.save_id
        AND public.is_household_member(s.household_id)
        AND (
          s.visibility = 'household'
          OR s.created_by = auth.uid()
        )
    )
  );

------------------------------------------------------------
-- 6. Same for variations and save_tags — they hang off saves
------------------------------------------------------------

DROP POLICY IF EXISTS "variations_select" ON public.variations;

CREATE POLICY "variations_select" ON public.variations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      WHERE s.id = variations.save_id
        AND public.is_household_member(s.household_id)
        AND (
          s.visibility = 'household'
          OR s.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "save_tags_select" ON public.save_tags;

CREATE POLICY "save_tags_select" ON public.save_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saves s
      WHERE s.id = save_tags.save_id
        AND public.is_household_member(s.household_id)
        AND (
          s.visibility = 'household'
          OR s.created_by = auth.uid()
        )
    )
  );
