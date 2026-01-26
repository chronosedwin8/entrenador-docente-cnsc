-- Create default maintenance configuration
INSERT INTO public.app_settings (key, value)
VALUES (
  'maintenance_config',
  '{
    "enabled": false,
    "message": "Estamos realizando actualizaciones para mejorar el servicio. Volveremos pronto."
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
