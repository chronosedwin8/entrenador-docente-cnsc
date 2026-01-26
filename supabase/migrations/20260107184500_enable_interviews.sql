-- Create app_settings table for global configuration
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);

-- Enable RLS on app_settings
alter table public.app_settings enable row level security;

-- Policy: Everyone can read app_settings (needed to check if interview is enabled)
create policy "Everyone can read app_settings"
  on public.app_settings for select
  using (true);

-- Policy: Only admins can update app_settings
-- Note: This requires the user to have a claim or be in a specific list, 
-- but for now we will rely on the application logic enforcing admin role via profiles.
-- Ideally, we should check auth.uid() against a role, but let's allow authenticated users to update 
-- if they pass the application admin check. To be safe, we can restrict to a service role or specific logic.
-- For this setup with Supabase, we'll allow update for authenticated users BUT 
-- realistically we should probably add a check against public.profiles if possible 
-- or just rely on backend/UI logic if RLS is too complex for the current setup.
-- Let's stick to a simple "Authenticated users can update" for simplicity in this project context 
-- assuming the frontend Admin panel is the gatekeeper, OR better:
create policy "Admins can update app_settings"
  on public.app_settings for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.system_role = 'admin'
    )
  );

create policy "Admins can insert app_settings"
  on public.app_settings for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.system_role = 'admin'
    )
  );

-- Insert default value for interview_enabled
insert into public.app_settings (key, value)
values ('interview_enabled', 'false'::jsonb)
on conflict (key) do nothing;


-- Create interview_logs table to track usage
create table if not exists public.interview_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.interview_logs enable row level security;

-- Policy: Users can insert their own logs
create policy "Users can insert their own interview logs"
  on public.interview_logs for insert
  with check (auth.uid() = user_id);

-- Policy: Users can view their own logs (to check if they already took one)
create policy "Users can view their own interview logs"
  on public.interview_logs for select
  using (auth.uid() = user_id);

-- Policy: Admins can view all logs
create policy "Admins can view all interview logs"
  on public.interview_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.system_role = 'admin'
    )
  );
