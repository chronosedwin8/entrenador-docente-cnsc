-- =============================================================================
-- CAMBIO DE CONTRASEÑA POR PARTE DEL ADMINISTRADOR
-- =============================================================================
-- Permite a un administrador establecer una nueva contraseña para cualquier
-- usuario (soporte para usuarios que olvidaron/no saben cambiar su clave).
--
-- GoTrue (Supabase Auth) almacena las contraseñas con bcrypt en
-- auth.users.encrypted_password. Usamos pgcrypto (crypt + gen_salt('bf'))
-- para generar un hash compatible, exactamente el mismo algoritmo que usa
-- Supabase internamente. Así el usuario podrá iniciar sesión con la nueva clave.
--
-- SECURITY DEFINER + verificación de rol admin (mismo patrón que delete_users).
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_set_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- 1. Solo administradores.
  SELECT p.system_role INTO current_user_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF current_user_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can change passwords.';
  END IF;

  -- 2. Validaciones básicas.
  IF new_password IS NULL OR length(new_password) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = target_user_id) THEN
    RAISE EXCEPTION 'El usuario no existe.';
  END IF;

  -- 3. Establecer la nueva contraseña (hash bcrypt compatible con GoTrue).
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_user_password(uuid, text) TO authenticated;
