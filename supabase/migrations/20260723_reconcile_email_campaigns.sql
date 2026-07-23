-- =============================================================================
-- RECONCILIACIÓN DE CAMPAÑAS DE EMAIL
-- =============================================================================
-- Problema: los contadores email_campaigns.successful_sends / failed_sends se
-- incrementan por lote y pueden quedar desfasados; el estado a veces queda
-- atascado en 'sending' aunque ya se procesaron todos los destinatarios.
--
-- Esta función recalcula los contadores y el estado a partir de la FUENTE DE
-- VERDAD real: la tabla email_recipients (cada fila tiene su propio estado).
-- Es idempotente: llamarla varias veces siempre deja los datos correctos.
--
-- SECURITY DEFINER + verificación de rol admin.
-- =============================================================================

CREATE OR REPLACE FUNCTION reconcile_campaign_stats(p_campaign_id uuid)
RETURNS TABLE (
  status text,
  recipient_count integer,
  successful integer,
  failed integer,
  pending integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
  v_total   integer;
  v_sent    integer;
  v_failed  integer;
  v_pending integer;
  v_status  text;
BEGIN
  -- Solo administradores.
  SELECT p.system_role INTO current_user_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF current_user_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reconcile campaigns.';
  END IF;

  -- Conteos reales desde email_recipients.
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE r.status = 'sent')::int,
    count(*) FILTER (WHERE r.status IN ('failed', 'bounced'))::int,
    count(*) FILTER (WHERE r.status = 'pending')::int
  INTO v_total, v_sent, v_failed, v_pending
  FROM public.email_recipients r
  WHERE r.campaign_id = p_campaign_id;

  -- Determinar estado real.
  IF v_total = 0 THEN
    -- Sin destinatarios registrados: no tocar el estado actual.
    SELECT c.status INTO v_status FROM public.email_campaigns c WHERE c.id = p_campaign_id;
  ELSIF v_pending = 0 THEN
    v_status := 'sent';
  ELSIF (v_sent + v_failed) > 0 THEN
    v_status := 'sending';
  ELSE
    -- Todos pendientes aún: conservar el estado actual (scheduled/sending).
    SELECT c.status INTO v_status FROM public.email_campaigns c WHERE c.id = p_campaign_id;
  END IF;

  -- Actualizar la campaña con los valores autoritativos.
  UPDATE public.email_campaigns c
  SET successful_sends = v_sent,
      failed_sends     = v_failed,
      status           = v_status,
      sent_at          = CASE WHEN v_status = 'sent' AND c.sent_at IS NULL THEN NOW() ELSE c.sent_at END
  WHERE c.id = p_campaign_id;

  RETURN QUERY SELECT v_status, v_total, v_sent, v_failed, v_pending;
END;
$$;

GRANT EXECUTE ON FUNCTION reconcile_campaign_stats(uuid) TO authenticated;
