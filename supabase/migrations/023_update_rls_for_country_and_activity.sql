-- Update RLS policies for country and activity tracking fields
-- Migration: 023_update_rls_for_country_and_activity.sql

-- Allow users to read their own country and activity data
CREATE POLICY "Users can view own country and activity"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own country data
CREATE POLICY "Users can update own country"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to read all country and activity data
CREATE POLICY "Admins can view all country and activity"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update all country and activity data
CREATE POLICY "Admins can update all country and activity"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable realtime on profiles table for activity tracking
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
