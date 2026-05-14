-- DEPRECATED monolithic script — if this failed mid-way, PostgreSQL rolled back ALL DDL.
-- Use instead:
--   1) 005_step1_add_invoice_columns_ONLY.sql  (run alone)
--   2) 006_step2_invoice_rpc_functions.sql       (run alone after 005)
--   3) 007_optional_backfill_and_not_null.sql   (optional)
--
-- Fix schema drift: older `invoices` / `investments` tables created without app columns
-- (CREATE TABLE IF NOT EXISTS does not add new columns to existing tables.)
-- Run in Supabase SQL Editor after 001–003.
--
-- Resolves:
--   - PGRST204 / "Could not find column amount_usd in schema cache"
--   - "column plan_id of relation invoices does not exist"
--   - "column i.last_profit_update does not exist" (investments + RPCs)

-- ---------------------------------------------------------------------------
-- Investments: columns expected by approve_invoice + apply_daily_profits
-- ---------------------------------------------------------------------------
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS last_profit_update timestamptz;

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Invoices: rename legacy column names (if you created tables from an older spec)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_entered'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_usd'
  ) THEN
    ALTER TABLE public.invoices RENAME COLUMN amount_entered TO amount_usd;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices'
      AND column_name = 'crypto_amount_converted'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices'
      AND column_name = 'crypto_amount'
  ) THEN
    ALTER TABLE public.invoices RENAME COLUMN crypto_amount_converted TO crypto_amount;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Invoices: add any columns still missing (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS wallet_type text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_usd numeric;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS crypto_amount numeric;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_address text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Backfill so NOT NULL + app constraints can be applied safely
UPDATE public.invoices
SET plan_id = 'UNKNOWN'
WHERE plan_id IS NULL OR trim(plan_id) = '';

UPDATE public.invoices
SET wallet_type = 'Bitcoin'
WHERE wallet_type IS NULL OR trim(wallet_type) = '';

UPDATE public.invoices
SET amount_usd = 0.01
WHERE amount_usd IS NULL;

UPDATE public.invoices
SET crypto_amount = 0
WHERE crypto_amount IS NULL;

UPDATE public.invoices
SET status = 'pending'
WHERE status IS NULL OR trim(status) = '';

UPDATE public.invoices
SET invoice_number = 'INV-MIGR-' || replace(id::text, '-', '')
WHERE invoice_number IS NULL OR trim(invoice_number) = '';

UPDATE public.invoices
SET payment_address = 'CONFIGURE_IN_SUPABASE_DASHBOARD'
WHERE payment_address IS NULL OR trim(payment_address) = '';

UPDATE public.invoices
SET created_at = now()
WHERE created_at IS NULL;

-- Enforce NOT NULL where the app requires it (fails loudly if backfill missed rows)
ALTER TABLE public.invoices ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN wallet_type SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN amount_usd SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN crypto_amount SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN invoice_number SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN payment_address SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Re-apply RPCs so they match current table definitions (safe if already exist)
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

  v_daily := inv.amount_usd * 0.20;

  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, last_profit_update)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily, p_invoice_id, NULL);
END;
$$;

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

-- Ask PostgREST to reload schema cache (fixes stale "column not found" after DDL)
NOTIFY pgrst, 'reload schema';
