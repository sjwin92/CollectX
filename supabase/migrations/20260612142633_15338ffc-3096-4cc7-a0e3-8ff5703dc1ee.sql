
-- 1. Revoke API execution on trigger-only SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2. Stop the card-images bucket from being publicly listable.
-- Files remain publicly downloadable by URL (bucket is public); only the
-- list/enumerate API is restricted to the file's owner.
DROP POLICY IF EXISTS "Card images publicly readable" ON storage.objects;

CREATE POLICY "Users list own card-images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'card-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
