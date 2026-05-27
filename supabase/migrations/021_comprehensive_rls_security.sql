-- Comprehensive RLS Security Migration
-- This migration secures all public tables with proper Row Level Security
-- while maintaining app functionality and admin dashboard access

-- ---------------------------------------------------------------------------
-- Add is_admin column to profiles if it doesn't exist (must be BEFORE is_admin function)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN is_admin boolean DEFAULT false;
    RAISE NOTICE 'Added is_admin column to profiles table';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Update is_admin() function to support both role='admin' AND is_admin=true
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        lower(trim(COALESCE(p.role::text, ''))) = 'admin'
        OR p.is_admin = true
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- investment_plans: Enable RLS (currently missing)
-- Public read access, admin write access only
-- ---------------------------------------------------------------------------
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_plans_public_read" ON public.investment_plans;
CREATE POLICY "investment_plans_public_read"
  ON public.investment_plans FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "investment_plans_admin_write" ON public.investment_plans;
CREATE POLICY "investment_plans_admin_write"
  ON public.investment_plans FOR ALL
  TO authenticated
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles: Ensure comprehensive policies
-- Users can only access their own profile, admins can access all
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_system_only" ON public.profiles;
CREATE POLICY "profiles_insert_system_only"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Profiles created by trigger only

DROP POLICY IF EXISTS "profiles_update_admin_or_self" ON public.profiles;
CREATE POLICY "profiles_update_admin_or_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- balances: Ensure comprehensive policies
-- Users can only see own balance, no direct writes (via RPC/triggers only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "balances_select_own_or_admin" ON public.balances;
CREATE POLICY "balances_select_own_or_admin"
  ON public.balances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "balances_insert_system_only" ON public.balances;
CREATE POLICY "balances_insert_system_only"
  ON public.balances FOR INSERT
  TO authenticated
  WITH CHECK (false); -- System only via RPC/triggers

DROP POLICY IF EXISTS "balances_update_system_only" ON public.balances;
CREATE POLICY "balances_update_system_only"
  ON public.balances FOR UPDATE
  TO authenticated
  USING (false); -- System only via RPC/triggers

DROP POLICY IF EXISTS "balances_delete_admin_only" ON public.balances;
CREATE POLICY "balances_delete_admin_only"
  ON public.balances FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- invoices: Ensure comprehensive policies
-- Users can select/insert own, admins full access
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_own_or_admin" ON public.invoices;
CREATE POLICY "invoices_select_own_or_admin"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "invoices_insert_own" ON public.invoices;
CREATE POLICY "invoices_insert_own"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "invoices_update_admin_only" ON public.invoices;
CREATE POLICY "invoices_update_admin_only"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "invoices_delete_admin_only" ON public.invoices;
CREATE POLICY "invoices_delete_admin_only"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- investments: Ensure comprehensive policies (was missing INSERT/UPDATE/DELETE)
-- Users can select own, admins full access
-- ---------------------------------------------------------------------------
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investments_select_own_or_admin" ON public.investments;
CREATE POLICY "investments_select_own_or_admin"
  ON public.investments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "investments_insert_admin_only" ON public.investments;
CREATE POLICY "investments_insert_admin_only"
  ON public.investments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "investments_update_admin_only" ON public.investments;
CREATE POLICY "investments_update_admin_only"
  ON public.investments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "investments_delete_admin_only" ON public.investments;
CREATE POLICY "investments_delete_admin_only"
  ON public.investments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- withdrawals: Ensure comprehensive policies
-- Users can select/insert own, admins full access
-- ---------------------------------------------------------------------------
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_select_own_or_admin" ON public.withdrawals;
CREATE POLICY "withdrawals_select_own_or_admin"
  ON public.withdrawals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawals;
CREATE POLICY "withdrawals_insert_own"
  ON public.withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "withdrawals_update_admin_only" ON public.withdrawals;
CREATE POLICY "withdrawals_update_admin_only"
  ON public.withdrawals FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "withdrawals_delete_admin_only" ON public.withdrawals;
CREATE POLICY "withdrawals_delete_admin_only"
  ON public.withdrawals FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- transactions: Ensure comprehensive policies (was missing UPDATE/DELETE)
-- Users can select own, system inserts via RPC, admins full access
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own_or_admin" ON public.transactions;
CREATE POLICY "transactions_select_own_or_admin"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "transactions_insert_system_only" ON public.transactions;
CREATE POLICY "transactions_insert_system_only"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (false); -- System only via RPC/triggers

DROP POLICY IF EXISTS "transactions_update_admin_only" ON public.transactions;
CREATE POLICY "transactions_update_admin_only"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "transactions_delete_admin_only" ON public.transactions;
CREATE POLICY "transactions_delete_admin_only"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- payment_addresses: Ensure comprehensive policies
-- Public read for authenticated, admin full access
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_addresses_read_authenticated" ON public.payment_addresses;
CREATE POLICY "payment_addresses_read_authenticated"
  ON public.payment_addresses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "payment_addresses_admin_write" ON public.payment_addresses;
CREATE POLICY "payment_addresses_admin_write"
  ON public.payment_addresses FOR ALL
  TO authenticated
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Verification: List all RLS policies
-- ---------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
