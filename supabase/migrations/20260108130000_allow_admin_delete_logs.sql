-- Allow Admins to delete interview logs
create policy "Admins can delete interview logs"
  on public.interview_logs for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.system_role = 'admin'
    )
  );
