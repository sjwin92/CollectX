
-- Function to get a user profile by ID
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
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id, 
    username, 
    full_name, 
    avatar_url, 
    reputation, 
    trade_count, 
    success_rate, 
    created_at, 
    updated_at
  FROM public.profiles
  WHERE id = user_id;
$$;
