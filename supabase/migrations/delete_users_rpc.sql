CREATE OR REPLACE FUNCTION delete_users(user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if executing user is admin
  SELECT system_role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_user_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- Delete from public.profiles explicitly first to ensure no FK issues if cascade is missing
  DELETE FROM public.profiles WHERE id = ANY(user_ids);

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = ANY(user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_users(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_users(uuid[]) TO service_role;
