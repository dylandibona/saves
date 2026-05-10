-- Personal share token per user, used by iOS Shortcut for background saves.
-- Stored in plain text (not hashed) so we can show it once in settings UI.
-- Treat like a password: anyone with the token can save URLs to your account.

ALTER TABLE public.users
  ADD COLUMN share_token text UNIQUE,
  ADD COLUMN share_token_created_at timestamptz;

-- Generate (or regenerate) a token on demand. SECURITY DEFINER + auth.uid()
-- means the function can only ever update the calling user's row.
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
BEGIN
  -- 32 bytes random → ~43-char base64url. Hard to guess, easy to copy.
  v_token := replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_');
  v_token := rtrim(v_token, '=');

  UPDATE public.users
  SET share_token = v_token,
      share_token_created_at = now()
  WHERE id = auth.uid();

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_share_token() TO authenticated;
