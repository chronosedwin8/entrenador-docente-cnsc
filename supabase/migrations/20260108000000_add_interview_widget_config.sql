-- Add interview_widget_code to app_settings
insert into public.app_settings (key, value)
values (
  'interview_widget_code', 
  '"<elevenlabs-convai agent-id=\"agent_2501ked73ws9fvk9x8dx34tj456r\"></elevenlabs-convai><script src=\"https://unpkg.com/@elevenlabs/convai-widget-embed\" async type=\"text/javascript\"></script>"'::jsonb
)
on conflict (key) do nothing;
