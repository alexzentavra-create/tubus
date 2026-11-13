-- Repair the legacy SQL-seeded account without changing its password or identity.
-- Verified NULLs caused Supabase Auth to fail while decoding this user.
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, '')
where id = 'bb1b5a8d-6efd-4b33-9b91-db26065307d4';
