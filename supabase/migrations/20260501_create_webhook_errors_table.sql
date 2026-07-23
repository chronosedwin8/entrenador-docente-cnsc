-- Migration: Create webhook_errors table for Wompi webhook audit trail
-- Date: 2026-05-01
-- Purpose: Persist webhook failures so admins can detect and retry activations

CREATE TABLE IF NOT EXISTS webhook_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'wompi-webhook',
  reference TEXT,
  wompi_transaction_id TEXT,
  payload JSONB,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_errors_reference ON webhook_errors(reference);
CREATE INDEX IF NOT EXISTS idx_webhook_errors_resolved ON webhook_errors(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_webhook_errors_created_at ON webhook_errors(created_at DESC);

ALTER TABLE webhook_errors ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook errors
CREATE POLICY "Admins can view webhook errors"
  ON webhook_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND system_role = 'admin'
    )
  );

-- Only admins can update (mark resolved)
CREATE POLICY "Admins can update webhook errors"
  ON webhook_errors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND system_role = 'admin'
    )
  );

-- Service role can insert/update (for Edge Functions)
CREATE POLICY "Service role can manage webhook errors"
  ON webhook_errors FOR ALL
  USING (auth.role() = 'service_role');

GRANT SELECT, UPDATE ON webhook_errors TO authenticated;
GRANT ALL ON webhook_errors TO service_role;
