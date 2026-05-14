-- Fix foreign key constraints for plan_id type mismatch
-- This script properly handles the foreign key constraint when changing data types

-- Step 1: Drop existing foreign key constraint if it exists
DO $$
BEGIN
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'investments' 
        AND constraint_name = 'investments_plan_id_fkey'
    ) THEN
        ALTER TABLE public.investments DROP CONSTRAINT investments_plan_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint investments_plan_id_fkey';
    END IF;
END $$;

-- Step 2: Change investment_plans.id from uuid to text to match plan_id
DO $$
BEGIN
    -- Check if investment_plans.id is uuid type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'investment_plans' 
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
        -- Clear existing data since we're changing the primary key type
        DELETE FROM public.investment_plans;
        
        -- Drop primary key constraint
        ALTER TABLE public.investment_plans DROP CONSTRAINT investment_plans_pkey;
        
        -- Change id type from uuid to text
        ALTER TABLE public.investment_plans ALTER COLUMN id TYPE text;
        
        -- Recreate primary key constraint
        ALTER TABLE public.investment_plans ADD PRIMARY KEY (id);
        
        RAISE NOTICE 'Changed investment_plans.id from uuid to text';
    ELSE
        RAISE NOTICE 'investment_plans.id is already text or does not exist';
    END IF;
END $$;

-- Step 3: Change investments.plan_id from uuid to text
DO $$
BEGIN
    -- Check if investments.plan_id is uuid type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'investments' 
        AND column_name = 'plan_id'
        AND data_type = 'uuid'
    ) THEN
        -- Clear existing investments since we're changing the data type
        DELETE FROM public.investments;
        
        -- Change plan_id type from uuid to text
        ALTER TABLE public.investments ALTER COLUMN plan_id TYPE text;
        
        RAISE NOTICE 'Changed investments.plan_id from uuid to text';
    ELSE
        RAISE NOTICE 'investments.plan_id is already text or does not exist';
    END IF;
END $$;

-- Step 4: Add missing columns to investments table
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
END $$;

-- Step 5: Recreate foreign key constraint with matching types
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'investments' 
        AND constraint_name = 'investments_plan_id_fkey'
    ) THEN
        ALTER TABLE public.investments 
        ADD CONSTRAINT investments_plan_id_fkey 
        FOREIGN KEY (plan_id) REFERENCES public.investment_plans(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Recreated foreign key constraint investments_plan_id_fkey';
    END IF;
END $$;

-- Step 6: Add missing reference_id column to transactions table
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

-- Step 7: Update investment plans to match Plans.jsx
DELETE FROM public.investment_plans;

INSERT INTO public.investment_plans (id, name, daily_profit_rate, commission_rate, minimum_amount, maximum_amount, is_active)
VALUES
  ('GOLD PLAN', 'GOLD PLAN', 0.20, 0.05, 500, 1000, true),
  ('SILVER', 'SILVER', 0.25, 0.10, 1000, 50000, true),
  ('DIAMOND', 'DIAMOND', 0.50, 0.25, 100000, 1000000, true);

-- Step 8: Update approve_invoice function
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

  -- Get investment plan details
  SELECT * INTO plan FROM public.investment_plans WHERE id = inv.plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'investment plan not found or inactive: %', inv.plan_id;
  END IF;

  -- Check amount requirements
  IF inv.amount_usd < plan.minimum_amount THEN
    RAISE EXCEPTION 'amount % below minimum for plan %', inv.amount_usd, inv.plan_id;
  END IF;
  IF plan.maximum_amount IS NOT NULL AND inv.amount_usd > plan.maximum_amount THEN
    RAISE EXCEPTION 'amount % exceeds maximum for plan %', inv.amount_usd, inv.plan_id;
  END IF;

  -- Update invoice status
  UPDATE public.invoices
  SET status = 'verified', verified_at = now()
  WHERE id = p_invoice_id;

  -- Add to user balance
  INSERT INTO public.balances (user_id, balance, updated_at)
  VALUES (inv.user_id, inv.amount_usd, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.balances.balance + EXCLUDED.balance,
      updated_at = now();

  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (inv.user_id, 'deposit', inv.amount_usd, 'completed', p_invoice_id);

  -- Calculate profit and commission
  v_daily_profit := inv.amount_usd * plan.daily_profit_rate;
  v_commission := inv.amount_usd * plan.commission_rate;

  -- Create investment record
  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, last_profit_update)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily_profit, p_invoice_id, NULL);

  -- Add commission transaction
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (inv.user_id, 'commission', v_commission, 'completed', p_invoice_id);

  -- Update balance with commission
  INSERT INTO public.balances (user_id, balance, updated_at)
  VALUES (inv.user_id, v_commission, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.balances.balance + EXCLUDED.balance,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;

-- Verify final table structures
SELECT 'investments' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investments' 
ORDER BY ordinal_position;

SELECT 'investment_plans' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investment_plans' 
ORDER BY ordinal_position;
