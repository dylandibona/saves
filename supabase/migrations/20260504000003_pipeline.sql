-- ============================================================
-- INBOUND CAPTURE PIPELINE TABLES
-- Everything that arrives via email, SMS, share, or paste lands
-- in inbound_messages first. The classifier and enricher run
-- against it before a save and capture are created.
-- ============================================================

-- inbound_messages
-- Raw landing zone. Failures stay here for retry and debugging.
CREATE TABLE public.inbound_messages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.users(id),
  channel           text        NOT NULL CHECK (channel IN ('email', 'sms', 'share', 'paste')),
  raw               jsonb       NOT NULL DEFAULT '{}',  -- full payload: email body, headers, SMS body, etc.
  extracted_url     text,
  extracted_text    text,
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN (
                                  'pending', 'processing', 'classified',
                                  'enriched', 'saved', 'failed', 'needs_review'
                                )),
  classifier_result jsonb,                              -- {category, confidence, reasoning}
  match_result      jsonb,                              -- {match_type, candidate_save_ids, scores}
  error             text,
  processed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- merge_proposals
-- Created when match confidence is 85-95%. User confirms merge or keeps separate.
-- Auto-expires to 'kept_separate' after 48 hours (see expire_merge_proposals function).
CREATE TABLE public.merge_proposals (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       uuid         NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  inbound_message_id uuid         NOT NULL REFERENCES public.inbound_messages(id),
  candidate_save_id  uuid         NOT NULL REFERENCES public.saves(id),
  proposed_save_data jsonb        NOT NULL DEFAULT '{}',
  confidence         numeric(4,3) NOT NULL,
  status             text         NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'merged', 'kept_separate', 'expired')),
  decided_at         timestamptz,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

-- map_syncs
-- Future opt-in sync to external map providers. Schema ready; UI not shipped in v1.
CREATE TABLE public.map_syncs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider        text        NOT NULL CHECK (provider IN ('google_my_maps', 'apple_maps_guide')),
  external_map_id text        NOT NULL,
  last_synced_at  timestamptz,
  config          jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
