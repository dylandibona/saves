-- ============================================================
-- INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_capture_email ON public.users (capture_email);

-- household_members
CREATE INDEX idx_household_members_household_id ON public.household_members (household_id);
CREATE INDEX idx_household_members_user_id      ON public.household_members (user_id);

-- recommenders
CREATE INDEX idx_recommenders_household_id ON public.recommenders (household_id);

-- Ensures each household has exactly one 'self' recommender
CREATE UNIQUE INDEX idx_recommenders_one_self_per_household
  ON public.recommenders (household_id)
  WHERE kind = 'self';

-- saves
CREATE INDEX idx_saves_household_id        ON public.saves (household_id);
CREATE INDEX idx_saves_category            ON public.saves (category);
CREATE INDEX idx_saves_last_captured_at    ON public.saves (last_captured_at DESC);
CREATE INDEX idx_saves_status              ON public.saves (status);
CREATE INDEX idx_saves_location            ON public.saves USING GIST (location);
CREATE INDEX idx_saves_external_ids        ON public.saves USING GIN (external_ids);
CREATE INDEX idx_saves_canonical_data      ON public.saves USING GIN (canonical_data);

-- Partial index for canonical_url deduplication (Sprint 1 /add form exact-match lookup)
CREATE INDEX idx_saves_canonical_url
  ON public.saves (household_id, canonical_url)
  WHERE canonical_url IS NOT NULL;

-- Full-text search on title + description
CREATE INDEX idx_saves_fts
  ON public.saves
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- captures
CREATE INDEX idx_captures_save_id        ON public.captures (save_id);
CREATE INDEX idx_captures_user_id        ON public.captures (user_id);
CREATE INDEX idx_captures_recommender_id ON public.captures (recommender_id);
CREATE INDEX idx_captures_captured_at    ON public.captures (captured_at DESC);

-- variations
CREATE INDEX idx_variations_save_id ON public.variations (save_id);

-- tags
CREATE INDEX idx_tags_household_id ON public.tags (household_id);

-- save_tags
CREATE INDEX idx_save_tags_tag_id ON public.save_tags (tag_id);

-- inbound_messages
CREATE INDEX idx_inbound_messages_user_id    ON public.inbound_messages (user_id);
CREATE INDEX idx_inbound_messages_status     ON public.inbound_messages (status);
CREATE INDEX idx_inbound_messages_created_at ON public.inbound_messages (created_at DESC);

-- merge_proposals
CREATE INDEX idx_merge_proposals_household_id      ON public.merge_proposals (household_id);
CREATE INDEX idx_merge_proposals_status            ON public.merge_proposals (status);
CREATE INDEX idx_merge_proposals_candidate_save_id ON public.merge_proposals (candidate_save_id);
