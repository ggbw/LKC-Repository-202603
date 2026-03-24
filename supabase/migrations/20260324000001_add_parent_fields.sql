-- Add additional parent/guardian profile fields
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS alternative_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS passport_number text;
