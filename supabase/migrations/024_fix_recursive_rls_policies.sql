-- Fix Recursive RLS Policies and Add Security Helper Function
-- Migration: 024_fix_recursive_rls_policies.sql

-- Step 1: Create SECURITY DEFINER helper function to check if user is admin
-- This function bypasses RLS to avoid recursive policy issues
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(coalesce(p.role::text, ''))) = 'admin'
  );
$$;

-- Step 2: Drop all existing policies on profiles table to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own country and activity" ON profiles;
DROP POLICY IF EXISTS "Users can update own country" ON profiles;
DROP POLICY IF EXISTS "Admins can view all country and activity" ON profiles;
DROP POLICY IF EXISTS "Admins can update all country and activity" ON profiles;

-- Step 3: Create new non-recursive RLS policies using the helper function

-- Users can view their own profile (including country and activity fields)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (including country and activity fields)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admins can update all profiles (including country and activity fields)
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Step 4: Add indexes for role column and activity fields for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON profiles(country_code);

-- Step 5: Grant execute permission on is_admin function to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- Step 6: Ensure realtime is properly enabled on profiles table
-- Remove and re-add to ensure clean state
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Step 7: Add comment to document the fix
COMMENT ON FUNCTION is_admin() IS 'Security definer function to check if current user is admin. Bypasses RLS to avoid recursive policy issues.';
