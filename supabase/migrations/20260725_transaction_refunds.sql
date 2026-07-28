-- =============================================================================
-- REEMBOLSOS DE TRANSACCIONES
-- =============================================================================
-- Cuando un usuario pide la devolución del dinero, esa transacción NO debe
-- contar como ingreso. Añadimos el estado 'REFUNDED' y una función para que
-- el administrador marque/desmarque una transacción como reembolsada.
-- El reporte de ingresos solo suma las que están en 'APPROVED'.
-- =============================================================================

-- 1. Permitir el nuevo estado 'REFUNDED' en la tabla.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR', 'REFUNDED'));

-- 2. Función admin para marcar (o revertir) un reembolso.
--    p_refunded = true  -> status 'REFUNDED' (deja de contar como ingreso)
--    p_refunded = false -> status 'APPROVED' (vuelve a contar)
CREATE OR REPLACE FUNCTION set_transaction_refunded(
  p_transaction_id uuid,
  p_refunded boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
BEGIN
  SELECT p.system_role INTO current_user_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF current_user_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can modify transactions.';
  END IF;

  UPDATE public.transactions
  SET status = CASE WHEN p_refunded THEN 'REFUNDED' ELSE 'APPROVED' END,
      updated_at = NOW()
  WHERE id = p_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_transaction_refunded(uuid, boolean) TO authenticated;
