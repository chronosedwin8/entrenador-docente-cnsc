-- FIXED: Changed FK to auth.users to allow emailing users without profiles
-- Change foreign key for email_recipients to reference auth.users instead of public.profiles
BEGIN;

ALTER TABLE email_recipients
  DROP CONSTRAINT IF EXISTS email_recipients_user_id_fkey;

ALTER TABLE email_recipients
  ADD CONSTRAINT email_recipients_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Also fix unsubscribed_users for the same reason
ALTER TABLE unsubscribed_users
  DROP CONSTRAINT IF EXISTS unsubscribed_users_user_id_fkey;

ALTER TABLE unsubscribed_users
  ADD CONSTRAINT unsubscribed_users_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMIT;
