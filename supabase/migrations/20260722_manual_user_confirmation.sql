-- =============================================================================
-- CONFIRMACIÓN MANUAL DE USUARIOS (Admin)
-- =============================================================================
-- Permite a los administradores listar y confirmar manualmente el correo de
-- los usuarios cuyo proceso de verificación por email falló, SIN eliminar el
-- flujo normal de verificación por correo.
--
-- Se implementa con funciones SECURITY DEFINER (igual que delete_users y
-- get_candidates_for_deletion) porque la tabla auth.users no es accesible
-- directamente desde el cliente con la anon key.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Listar usuarios NO confirmados (opcionalmente filtrados por correo)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_unconfirmed_users(search_email text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Solo administradores pueden consultar esta información sensible.
  SELECT p.system_role INTO current_user_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF current_user_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can list unconfirmed users.';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(p.name, 'Usuario'),
    COALESCE(p.role, 'Usuario'),
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.email_confirmed_at IS NULL
    AND (
      search_email IS NULL
      OR search_email = ''
      OR u.email ILIKE '%' || search_email || '%'
    )
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unconfirmed_users(text) TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. Confirmar manualmente uno o varios usuarios
-- -----------------------------------------------------------------------------
-- Marca el correo como confirmado estableciendo email_confirmed_at = NOW().
-- Esto es exactamente lo que hace internamente auth.admin.updateUserById con
-- { email_confirm: true }, permitiendo al usuario iniciar sesión.
-- Devuelve los IDs efectivamente confirmados (los que estaban pendientes).
CREATE OR REPLACE FUNCTION confirm_users_manually(user_ids uuid[])
RETURNS TABLE (confirmed_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Solo administradores pueden confirmar usuarios.
  SELECT p.system_role INTO current_user_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF current_user_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can confirm users.';
  END IF;

  RETURN QUERY
  UPDATE auth.users u
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE u.id = ANY(user_ids)
    AND u.email_confirmed_at IS NULL
  RETURNING u.id;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_users_manually(uuid[]) TO authenticated;
