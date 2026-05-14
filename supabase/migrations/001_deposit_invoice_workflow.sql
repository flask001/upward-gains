-- Upwards Gains — deposit, invoices, balances, investments, withdrawals, transactions
-- Run in Supabase SQL Editor (or supabase db push). Adjust if tables already exist.

-- ---------------------------------------------------------------------------
-- Helpers
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
      AND lower(trim(COALESCE(p.role::text, ''))) = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Payment addresses (lookup when creating invoices)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_key text NOT NULL UNIQUE,
  address text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Balances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.balances (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "balances_select_own_or_admin" ON public.balances;
CREATE POLICY "balances_select_own_or_admin"
  ON public.balances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users cannot update balances directly — only via RPC / triggers
DROP POLICY IF EXISTS "balances_no_direct_user_writes" ON public.balances;
CREATE POLICY "balances_no_direct_user_writes"
  ON public.balances FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "balances_no_direct_user_updates" ON public.balances;
CREATE POLICY "balances_no_direct_user_updates"
  ON public.balances FOR UPDATE
  TO authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  wallet_type text NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  crypto_amount numeric NOT NULL CHECK (crypto_amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  invoice_number text NOT NULL UNIQUE,
  payment_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);

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

-- No UPDATE / DELETE for regular users (admins use SECURITY DEFINER RPCs only)

-- ---------------------------------------------------------------------------
-- Investments (created when invoice verified)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  daily_profit numeric NOT NULL CHECK (daily_profit >= 0),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_profit_update timestamptz
);

-- If `investments` already existed from an older/partial run without this column,
-- CREATE TABLE IF NOT EXISTS skips — add the column before creating indexes on it.
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS investments_user_id_idx ON public.investments(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS investments_one_per_invoice
  ON public.investments(invoice_id)
  WHERE invoice_id IS NOT NULL;

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investments_select_own_or_admin" ON public.investments;
CREATE POLICY "investments_select_own_or_admin"
  ON public.investments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- Withdrawals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  wallet_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON public.withdrawals(status);

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

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'profit', 'commission')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed', 'rejected')),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_created_idx ON public.transactions(created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own_or_admin" ON public.transactions;
CREATE POLICY "transactions_select_own_or_admin"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "transactions_insert_system" ON public.transactions;
CREATE POLICY "transactions_insert_system"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- RPC: approve invoice (credit balance, investment, transaction)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  v_daily numeric;
  v_commission numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice not found';
  END IF;
  IF inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invoice not pending';
  END IF;

  IF EXISTS (SELECT 1 FROM public.investments WHERE invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'invoice already approved';
  END IF;

  UPDATE public.invoices
  SET status = 'verified', verified_at = now()
  WHERE id = p_invoice_id;

  INSERT INTO public.balances (user_id, balance, updated_at)
  VALUES (inv.user_id, inv.amount_usd, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.balances.balance + EXCLUDED.balance,
      updated_at = now();

  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (inv.user_id, 'deposit', inv.amount_usd, 'completed', p_invoice_id);

  -- Calculate commission (5% for GOLD PLAN, 10% for SILVER, 3% for basic)
  v_commission := inv.amount_usd * 
    CASE 
      WHEN inv.plan_id = 'GOLD PLAN' THEN 0.05
      WHEN inv.plan_id = 'SILVER' THEN 0.10
      WHEN inv.plan_id = 'basic' THEN 0.03
      WHEN inv.plan_id = 'standard' THEN 0.05
      ELSE 0.05
    END;

  -- Add commission transaction
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (inv.user_id, 'commission', v_commission, 'completed', p_invoice_id);

  v_daily := inv.amount_usd * 0.20;

  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, last_profit_update)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily, p_invoice_id, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: reject invoice
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.invoices
  SET status = 'rejected', verified_at = NULL
  WHERE id = p_invoice_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_invoice(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: admin creates invoice for a user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_invoice(
  p_user_id uuid,
  p_plan_id text,
  p_wallet_type text,
  p_amount_usd numeric,
  p_crypto_amount numeric,
  p_payment_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address text;
  v_number text;
  new_id uuid;
  v_wallet_key text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_wallet_key := CASE lower(trim(p_wallet_type))
    WHEN 'bitcoin' THEN 'bitcoin'
    WHEN 'ethereum' THEN 'ethereum'
    WHEN 'erc20' THEN 'erc20'
    WHEN 'tron' THEN 'tron'
    ELSE lower(replace(trim(p_wallet_type), ' ', '_'))
  END;

  v_address := COALESCE(
    NULLIF(trim(p_payment_address), ''),
    (SELECT address FROM public.payment_addresses
     WHERE wallet_key = v_wallet_key
     LIMIT 1),
    'CONFIGURE_PAYMENT_ADDRESS'
  );

  v_number := 'INV-' || to_char(now() AT TIME ZONE 'utc', 'YYYYMMDD') || '-'
    || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  INSERT INTO public.invoices (
    user_id, plan_id, wallet_type, amount_usd, crypto_amount,
    status, invoice_number, payment_address
  )
  VALUES (
    p_user_id, p_plan_id, p_wallet_type, p_amount_usd, p_crypto_amount,
    'pending', v_number, v_address
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_invoice(uuid, text, text, numeric, numeric, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: approve withdrawal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.withdrawals%ROWTYPE;
  b numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO w FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'withdrawal not found';
  END IF;
  IF w.status <> 'pending' THEN
    RAISE EXCEPTION 'withdrawal not pending';
  END IF;

  SELECT balance INTO b FROM public.balances WHERE user_id = w.user_id FOR UPDATE;
  IF b IS NULL OR b < w.amount THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  UPDATE public.balances
  SET balance = balance - w.amount, updated_at = now()
  WHERE user_id = w.user_id;

  UPDATE public.withdrawals SET status = 'approved' WHERE id = p_withdrawal_id;

  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (w.user_id, 'withdrawal', w.amount, 'completed', p_withdrawal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: reject withdrawal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.withdrawals
  SET status = 'rejected'
  WHERE id = p_withdrawal_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Daily profit batch (call from pg_cron or Edge Function with service role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_daily_profits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer := 0;
  r record;
  cutoff date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  -- Allow pg_cron / service calls (no JWT user). Logged-in callers must be admin.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT i.*
    FROM public.investments i
    WHERE i.last_profit_update IS NULL
       OR (i.last_profit_update AT TIME ZONE 'utc')::date < cutoff
  LOOP
    INSERT INTO public.balances (user_id, balance, updated_at)
    VALUES (r.user_id, r.daily_profit, now())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.balances.balance + EXCLUDED.balance,
        updated_at = now();

    INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
    VALUES (r.user_id, 'profit', r.daily_profit, 'completed', r.id);

    UPDATE public.investments
    SET last_profit_update = now()
    WHERE id = r.id;

    cnt := cnt + 1;
  END LOOP;

  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_profits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_profits() TO service_role;

-- ---------------------------------------------------------------------------
-- Seed default payment addresses (REPLACE with real wallets)
-- ---------------------------------------------------------------------------
INSERT INTO public.payment_addresses (wallet_key, address)
VALUES
  ('bitcoin', 'YOUR_BITCOIN_ADDRESS'),
  ('ethereum', 'YOUR_ETHEREUM_ADDRESS'),
  ('erc20', 'YOUR_USDT_ERC20_ADDRESS'),
  ('tron', 'YOUR_USDT_TRC20_ADDRESS')
ON CONFLICT (wallet_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Realtime: enable in Dashboard → Database → Replication for `transactions`
-- Also run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
-- ---------------------------------------------------------------------------
