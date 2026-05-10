-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE save_category AS ENUM (
  'recipe', 'tv', 'movie', 'restaurant', 'hotel', 'place', 'event',
  'book', 'podcast', 'music', 'article', 'product', 'workout', 'noted'
);

-- ============================================================
-- CORE TABLES
-- Table creation order respects all FK dependencies.
-- ============================================================

-- users
-- Mirrors auth.users; extended with app-specific fields.
-- id is the same UUID as auth.users.id.
CREATE TABLE public.users (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        UNIQUE NOT NULL,
  phone         text        UNIQUE,               -- E.164 format for SMS capture
  display_name  text,
  avatar_url    text,
  home_location geography(point, 4326),           -- for distance calculations on places
  home_city     text,
  home_country  text,
  timezone      text,
  capture_email text        UNIQUE,                -- set by application after signup; format: {user}-{hex}@{INBOUND_EMAIL_DOMAIN}
  capture_color text,                             -- hex, for self-saves in shared spaces
  settings      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- households
-- The sharing primitive. Every user belongs to one, created at signup.
CREATE TABLE public.households (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_by uuid        NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- household_members
CREATE TABLE public.household_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         text        NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

-- sources
-- Global (not per-household). The origin of content: nytcooking.com, instagram.com, etc.
CREATE TABLE public.sources (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain       text        NOT NULL,            -- 'cooking.nytimes.com', 'instagram.com'
  platform     text        NOT NULL,            -- 'web' | 'instagram' | 'spotify' | etc.
  display_name text        NOT NULL,
  icon_url     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain, platform)
);

-- recommenders
-- Who put something on your radar: a person, account, publication, show, or yourself.
CREATE TABLE public.recommenders (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  kind         text        NOT NULL CHECK (kind IN ('person', 'account', 'publication', 'show', 'self')),
  display_name text        NOT NULL,
  handle       text,                            -- @samsifton, etc.
  platform     text,                            -- 'instagram' | 'twitter' | 'sms' | 'email' | etc.
  contact      text,                            -- phone, email, or URL depending on kind
  color        text,                            -- hex, auto-assigned, user-editable
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- NULLS NOT DISTINCT ensures only one row per (household, kind, platform, NULL contact)
  -- which prevents duplicate 'self' recommenders where contact is always NULL.
  UNIQUE NULLS NOT DISTINCT (household_id, kind, platform, contact)
);

-- saves
-- The canonical entry. One per real-world thing per household.
CREATE TABLE public.saves (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id     uuid          NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category         save_category NOT NULL,
  title            text          NOT NULL,
  subtitle         text,                        -- author, chef, director, venue, etc.
  description      text,                        -- short ~1-2 sentences
  hero_image_url   text,
  canonical_url    text,
  canonical_data   jsonb         NOT NULL DEFAULT '{}',
  external_ids     jsonb         NOT NULL DEFAULT '{}',  -- {tmdb: 12345, isbn: "...", place_id: "..."}
  location         geography(point, 4326),
  location_address text,
  capture_count    int           NOT NULL DEFAULT 1,     -- maintained by trigger
  last_captured_at timestamptz,                          -- maintained by trigger
  status           text          NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'archived', 'merged_into')),
  merged_into_id   uuid          REFERENCES public.saves(id),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- captures
-- Every save event. A save has many captures.
CREATE TABLE public.captures (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id        uuid        NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES public.users(id),
  recommender_id uuid        REFERENCES public.recommenders(id),
  source_id      uuid        REFERENCES public.sources(id),
  note           text,
  raw_payload    jsonb,
  capture_method text        NOT NULL CHECK (
                               capture_method IN ('email', 'sms', 'share_ios', 'share_android', 'web_paste', 'manual')
                             ),
  captured_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- variations
-- Near-match merge deltas: when two captures of the same thing differ meaningfully.
CREATE TABLE public.variations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id    uuid        NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  capture_id uuid        NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
  label      text        NOT NULL,             -- 'NYT Cooking version', 'from Mike'
  delta      jsonb       NOT NULL DEFAULT '{}',
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- tags
-- User-defined tags. kind discriminator is ready for trip and list modes.
CREATE TABLE public.tags (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  kind         text        NOT NULL DEFAULT 'tag' CHECK (kind IN ('tag', 'trip', 'list')),
  metadata     jsonb       NOT NULL DEFAULT '{}',  -- for trips: {city, country, dates}
  color        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, name, kind)
);

-- save_tags
CREATE TABLE public.save_tags (
  save_id    uuid        NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  tag_id     uuid        NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  added_by   uuid        NOT NULL REFERENCES public.users(id),
  added_at   timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (save_id, tag_id)
);
