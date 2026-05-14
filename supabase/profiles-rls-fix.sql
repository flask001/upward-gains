-- -----------------------------------------------------------------------------
-- Fix: "infinite recursion detected in policy for relation profiles"
-- Run once in Supabase SQL Editor (replaces conflicting policies / hardens helpers).
--
-- Typical causes:
-- • Policies subquery profiles directly instead of SECURITY DEFINER helper
-- • FORCE ROW LEVEL SECURITY on profiles forces even elevated checks through RLS
-- • Duplicate/overlapping policies from multiple migration runs
-- -----------------------------------------------------------------------------

-- Ensure table owners / helper queries are not trapped in FORCE RLS recursion
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;

-- Drop every policy on public.profiles (safe if you only use this migration path)
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- Function must bypass RLS on profiles when resolving admin (SECURITY DEFINER + stable owner)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Recreate policies. Subquery wrappers reduce per-row re-evaluation & recursion quirks.
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- Optional: if this errors, policies above are still created (run later as superuser if needed)
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.is_admin() OWNER TO postgres';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipped is_admin() owner change: %', SQLERRM;
END $$;
