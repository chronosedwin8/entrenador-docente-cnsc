CREATE OR REPLACE FUNCTION get_candidates_for_deletion(
  criteria text,
  cutoff_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamp with time zone,
  last_login_at timestamp with time zone,
  name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(p.name, 'Usuario'),
    COALESCE(p.role, 'Usuario')
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE
    CASE
      WHEN criteria = 'unverified_email' THEN
        u.email_confirmed_at IS NULL
      WHEN criteria = 'ghost_users' THEN
        u.created_at < (NOW() - INTERVAL '30 days')
        AND NOT EXISTS (SELECT 1 FROM public.simulations s WHERE s.user_id = u.id)
      WHEN criteria = 'inactive_date' THEN
        cutoff_date IS NOT NULL AND (
          u.last_sign_in_at < cutoff_date 
          OR (u.last_sign_in_at IS NULL AND u.created_at < cutoff_date)
        )
      WHEN criteria = 'no_simulations_ever' THEN
        NOT EXISTS (SELECT 1 FROM public.simulations s WHERE s.user_id = u.id)
      ELSE false
    END;
END;
$$;
