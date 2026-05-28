-- Add country and activity tracking fields to profiles table
-- Migration: 022_add_user_country_and_activity_tracking.sql

-- Add new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS country_name TEXT,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Create index on last_seen for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);

-- Add comment to document the new fields
COMMENT ON COLUMN profiles.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, GB, DE)';
COMMENT ON COLUMN profiles.country_name IS 'Full country name (e.g., United States, United Kingdom)';
COMMENT ON COLUMN profiles.last_seen IS 'Timestamp of last user activity';
COMMENT ON COLUMN profiles.is_online IS 'Current online status (true if user was active within last 5 minutes)';
