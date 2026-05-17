-- enrichment_errors — per-save log of issues during the enrichment pipeline.
-- Lets us triage capture failures once multiple users are saving content.
--
-- Shape: { ts: ISO, phase: 'fetch'|'oembed'|'classify'|'places', message: string, ... }[]
-- A save with empty or null enrichment_errors had a clean run.
--
-- Stays small in the common case — only written on warnings/fallbacks.

ALTER TABLE public.saves
  ADD COLUMN enrichment_errors jsonb;

-- Partial index for triage queries: "show me all saves that had any issue".
CREATE INDEX idx_saves_enrichment_errors
  ON public.saves ((enrichment_errors IS NOT NULL))
  WHERE enrichment_errors IS NOT NULL;

COMMENT ON COLUMN public.saves.enrichment_errors IS
  'JSONB array of warnings / fallbacks recorded during enrichment. '
  'Null on clean runs. Used for post-hoc debugging of capture failures.';
