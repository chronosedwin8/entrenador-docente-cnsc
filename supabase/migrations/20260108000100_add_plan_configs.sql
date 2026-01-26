-- Create default plan configurations
INSERT INTO public.app_settings (key, value)
VALUES (
  'plan_configurations',
  '{
    "basic": {
      "price": 100000,
      "daily_sims": 1,
      "monthly_sims": 8,
      "questions_per_sim": 20
    },
    "intermediate": {
      "price": 180000,
      "daily_sims": 2,
      "monthly_sims": 20,
      "questions_per_sim": 30
    },
    "advanced": {
      "price": 300000,
      "daily_sims": 3,
      "monthly_sims": 40,
      "questions_per_sim": 50
    }
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Create default interview pricing configuration
INSERT INTO public.app_settings (key, value)
VALUES (
  'interview_pricing_config',
  '{
    "percentage_increase": 30,
    "included_interviews": 12
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
