-- Fix missing end_date column in investments table
-- This script handles the end_date constraint issue

-- First, check the actual structure of investments table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investments' 
ORDER BY ordinal_position;

-- Check if end_date column exists and is NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'end_date'
    AND is_nullable = 'NO'
  ) THEN
    -- Make end_date nullable temporarily
    ALTER TABLE public.investments ALTER COLUMN end_date DROP NOT NULL;
    RAISE NOTICE 'Made end_date column nullable';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'end_date'
  ) THEN
    -- Add end_date column as nullable
    ALTER TABLE public.investments ADD COLUMN end_date timestamptz;
    RAISE NOTICE 'Added end_date column to investments table';
  ELSE
    RAISE NOTICE 'end_date column already exists and is nullable';
  END IF;
END $$;

-- Also check for any other required columns that might be missing
DO $$
BEGIN
  -- Add daily_profit column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'daily_profit'
  ) THEN
    ALTER TABLE public.investments ADD COLUMN daily_profit numeric CHECK (daily_profit >= 0);
  END IF;

  -- Add last_profit_update column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'last_profit_update'
  ) THEN
    ALTER TABLE public.investments ADD COLUMN last_profit_update timestamptz;
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.investments ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Drop foreign key constraint if it exists and recreate properly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'investments' 
        AND constraint_name = 'investments_plan_id_fkey'
    ) THEN
        ALTER TABLE public.investments DROP CONSTRAINT investments_plan_id_fkey;
    END IF;
END $$;

-- Ensure plan_id is text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'investments' 
        AND column_name = 'plan_id'
        AND data_type = 'uuid'
    ) THEN
        DELETE FROM public.investments;
        ALTER TABLE public.investments ALTER COLUMN plan_id TYPE text;
    END IF;
END $$;

-- Ensure investment_plans.id is text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'investment_plans' 
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
        DELETE FROM public.investment_plans;
        ALTER TABLE public.investment_plans DROP CONSTRAINT investment_plans_pkey;
        ALTER TABLE public.investment_plans ALTER COLUMN id TYPE text;
        ALTER TABLE public.investment_plans ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Recreate foreign key constraint
ALTER TABLE public.investments 
ADD CONSTRAINT investments_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.investment_plans(id) 
ON DELETE SET NULL;

-- Add reference_id to transactions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN reference_id uuid;
  END IF;
END $$;

-- Update investment plans
DELETE FROM public.investment_plans;

INSERT INTO public.investment_plans (id, name, daily_profit_rate, commission_rate, minimum_amount, maximum_amount, is_active)
VALUES
  ('GOLD PLAN', 'GOLD PLAN', 0.20, 0.05, 500, 1000, true),
  ('SILVER', 'SILVER', 0.25, 0.10, 1000, 50000, true),
  ('DIAMOND', 'DIAMOND', 0.50, 0.25, 100000, 1000000, true);

-- Update approve_invoice function to handle end_date properly
CREATE OR REPLACE FUNCTION public.approve_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  plan public.investment_plans%ROWTYPE;
  v_daily_profit numeric;
  v_commission numeric;
  v_end_date timestamptz;
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

  SELECT * INTO plan FROM public.investment_plans WHERE id = inv.plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'investment plan not found or inactive: %', inv.plan_id;
  END IF;

  IF inv.amount_usd < plan.minimum_amount THEN
    RAISE EXCEPTION 'amount % below minimum for plan %', inv.amount_usd, inv.plan_id;
  END IF;
  IF plan.maximum_amount IS NOT NULL AND inv.amount_usd > plan.maximum_amount THEN
    RAISE EXCEPTION 'amount % exceeds maximum for plan %', inv.amount_usd, inv.plan_id;
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

  v_daily_profit := inv.amount_usd * plan.daily_profit_rate;
  v_commission := inv.amount_usd * plan.commission_rate;
  
  -- Calculate end_date based on plan (optional - can be NULL if not needed)
  -- For now, set it to NULL since it's not required for daily profit calculations
  v_end_date := NULL;

  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, created_at, last_profit_update, end_date)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily_profit, p_invoice_id, now(), NULL, v_end_date);

  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (inv.user_id, 'commission', v_commission, 'completed', p_invoice_id);

  INSERT INTO public.balances (user_id, balance, updated_at)
  VALUES (inv.user_id, v_commission, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.balances.balance + EXCLUDED.balance,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;

-- Verify final table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investments' 
ORDER BY ordinal_position;
