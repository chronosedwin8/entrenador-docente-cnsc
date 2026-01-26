-- ============================================
-- MIGRATION: Email Campaign System + User Metrics
-- ============================================

-- ============================================
-- PART 1: Email Campaign Tables
-- ============================================

-- Tabla principal de campañas de email
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  
  -- Filtros usados (guardados para referencia)
  filter_criteria JSONB,
  recipient_count INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- Tabla de destinatarios individuales
CREATE TABLE IF NOT EXISTS email_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'bounced', 'failed', 'unsubscribed')),
  error_message TEXT,
  
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_user ON email_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_status ON email_recipients(status);

-- Tabla de usuarios que se dieron de baja
CREATE TABLE IF NOT EXISTS unsubscribed_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email VARCHAR(255) NOT NULL,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  deleted_account BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_unsubscribed_users_email ON unsubscribed_users(email);

-- ============================================
-- PART 2: User Metrics Tracking
-- ============================================

-- Agregar columnas de tracking a profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_simulation_at TIMESTAMPTZ;

-- Índices para optimizar queries de filtrado
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed 
  ON profiles(email_confirmed_at);
  
CREATE INDEX IF NOT EXISTS idx_profiles_last_login 
  ON profiles(last_login_at);
  
CREATE INDEX IF NOT EXISTS idx_profiles_last_simulation 
  ON profiles(last_simulation_at);

-- ============================================
-- PART 3: Triggers
-- ============================================

-- Trigger para actualizar last_simulation_at automáticamente
CREATE OR REPLACE FUNCTION update_user_last_simulation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_simulation_at = NEW.created_at
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_simulation_created ON simulations;
CREATE TRIGGER on_simulation_created
  AFTER INSERT ON simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_simulation();

-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribed_users ENABLE ROW LEVEL SECURITY;

-- Policies for email_campaigns (solo admins)
DROP POLICY IF EXISTS "Admins can view campaigns" ON email_campaigns;
CREATE POLICY "Admins can view campaigns" ON email_campaigns
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.system_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create campaigns" ON email_campaigns;
CREATE POLICY "Admins can create campaigns" ON email_campaigns
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.system_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update campaigns" ON email_campaigns;
CREATE POLICY "Admins can update campaigns" ON email_campaigns
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.system_role = 'admin'
    )
  );

-- Policies for email_recipients (solo admins)
DROP POLICY IF EXISTS "Admins can view recipients" ON email_recipients;
CREATE POLICY "Admins can view recipients" ON email_recipients
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.system_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage recipients" ON email_recipients;
CREATE POLICY "Admins can manage recipients" ON email_recipients
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.system_role = 'admin'
    )
  );

-- Policies for unsubscribed_users
DROP POLICY IF EXISTS "Users can view own unsubscribe status" ON unsubscribed_users;
CREATE POLICY "Users can view own unsubscribe status" ON unsubscribed_users
  FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unsubscribe" ON unsubscribed_users;
CREATE POLICY "Users can unsubscribe" ON unsubscribed_users
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all unsubscribes" ON unsubscribed_users;
CREATE POLICY "Admins can view all unsubscribes" ON unsubscribed_users
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.system_role = 'admin'
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================
-- Run after migration:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('email_campaigns', 'email_recipients', 'unsubscribed_users');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('email_confirmed_at', 'last_login_at', 'last_simulation_at');
