-- Fix: the households UPDATE policy had a self-referential typo on
-- household_members that caused the subquery to match nothing, silently
-- denying every rename attempt. The bug:
--
--   household_members.household_id = household_members.id
--                                    ^^^^^^^^^^^^^^^^^^^
--
-- should be:
--
--   household_members.household_id = households.id
--
-- Symptom Dylan reported: tapping Save on Family rename did nothing.
-- Server Action ran, .update() returned no error (RLS denies are silent
-- for updates that match zero rows), but the row was never modified.
-- The UI used the locally-set name so it appeared to save until reload.

DROP POLICY IF EXISTS households_update_owner ON public.households;

CREATE POLICY households_update_owner
  ON public.households
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members
      WHERE household_members.household_id = households.id
        AND household_members.user_id      = auth.uid()
        AND household_members.role         = 'owner'
    )
  );
