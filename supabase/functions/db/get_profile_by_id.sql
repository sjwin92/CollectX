
-- Function to get a user profile by ID (with fallback for when profiles don't exist)
CREATE OR REPLACE FUNCTION public.get_profile_by_id(user_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  reputation text,
  trade_count integer,
  success_rate integer,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the profiles table exists
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    -- Return data from the profiles table if it exists
    RETURN QUERY
    SELECT 
      p.id, 
      p.username, 
      p.full_name, 
      p.avatar_url, 
      p.reputation, 
      p.trade_count, 
      p.success_rate, 
      p.created_at, 
      p.updated_at
    FROM public.profiles p
    WHERE p.id = user_id;
  ELSE
    -- Return minimal data from auth.users as fallback
    RETURN QUERY
    SELECT 
      u.id,
      -- Default username from email
      split_part(u.email, '@', 1) as username,
      '' as full_name,
      '' as avatar_url,
      'new' as reputation,
      0 as trade_count,
      0 as success_rate,
      u.created_at,
      u.updated_at
    FROM auth.users u
    WHERE u.id = user_id;
  END IF;
END
$$;
