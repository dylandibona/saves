-- Hero image persistence.
--
-- Problem: hero_image_url currently points at the original source CDN
-- (Instagram, Google Photos / lh3.googleusercontent.com, news sites).
-- Instagram CDN URLs are session-tokened and rot within days. Other
-- sources rot more slowly but still rot. Once the URL dies, the card has
-- no thumbnail.
--
-- Solution: on save creation, fetch the OG image, resize to ~800px webp,
-- upload to Supabase Storage at hero-images/{save_id}.webp, and store
-- the Storage path. hero_image_url remains as the original-URL reference
-- in case we ever want to re-derive or audit.

-- ── Column ──────────────────────────────────────────────────────────
ALTER TABLE public.saves
  ADD COLUMN hero_image_storage_path text;

COMMENT ON COLUMN public.saves.hero_image_storage_path IS
  'Path inside the hero-images Storage bucket. Null while the original '
  'hero_image_url is being used; non-null once persisted. Renderers '
  'prefer the storage path when present.';

-- ── Public hero-images bucket ───────────────────────────────────────
-- Public read so <img src> works without signed URLs. Writes go through
-- service-role via the server (storage.objects has its own RLS).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-images',
  'hero-images',
  true,
  2 * 1024 * 1024,  -- 2 MB ceiling per object; ~10x our typical webp
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS on storage.objects for this bucket ──────────────────────────
-- We let anon + authenticated read every object in the bucket (it's a
-- public bucket — the URLs are unguessable enough for a private library
-- in practice; if we ever need true privacy we switch to signed URLs).
-- Writes restricted to service_role, which the server uses for uploads.

CREATE POLICY hero_images_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'hero-images');
