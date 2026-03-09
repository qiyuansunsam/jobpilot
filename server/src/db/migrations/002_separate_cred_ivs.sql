-- Add separate IV/auth_tag for password encryption (idempotent)
ALTER TABLE platform_credentials ADD COLUMN pass_iv TEXT;
ALTER TABLE platform_credentials ADD COLUMN pass_auth_tag TEXT;
