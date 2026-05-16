-- Add investment duration support
-- This migration adds duration tracking to investments and updates the daily profit function
-- to stop applying profits after the investment duration ends

-- Add duration_days column to investment_plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investment_plans' 
    AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE public.investment_plans ADD COLUMN duration_days integer CHECK (duration_days > 0);
    RAISE NOTICE 'Added duration_days column to investment_plans table';
  ELSE
    RAISE NOTICE 'duration_days column already exists in investment_plans table';
  END IF;
END $$;

-- Add start_date and end_date columns to investments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.investments ADD COLUMN start_date timestamptz DEFAULT now();
    RAISE NOTICE 'Added start_date column to investments table';
  ELSE
    RAISE NOTICE 'start_date column already exists in investments table';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.investments ADD COLUMN end_date timestamptz;
    RAISE NOTICE 'Added end_date column to investments table';
  ELSE
    RAISE NOTICE 'end_date column already exists in investments table';
  END IF;
END $$;

-- Update investment_plans with correct durations based on plan
UPDATE public.investment_plans 
SET duration_days = 5
WHERE id = 'GOLD PLAN';

UPDATE public.investment_plans 
SET duration_days = 4
WHERE id = 'SILVER';

UPDATE public.investment_plans 
SET duration_days = 3
WHERE id = 'DIAMOND';

-- Update approve_invoice function to set start_date and end_date when creating investment
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
  v_start_date timestamptz;
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

  -- Get the investment plan details
  SELECT * INTO plan FROM public.investment_plans WHERE id = inv.plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'investment plan not found or inactive: %', inv.plan_id;
  END IF;

  -- Check if amount meets plan requirements
  IF inv.amount_usd < plan.minimum_amount THEN
    RAISE EXCEPTION 'amount % is below minimum requirement for plan %', inv.amount_usd, inv.plan_id;
  END IF;
  IF plan.maximum_amount IS NOT NULL AND inv.amount_usd > plan.maximum_amount THEN
    RAISE EXCEPTION 'amount % exceeds maximum requirement for plan %', inv.amount_usd, inv.plan_id;
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

  -- Calculate daily profit and commission based on plan
  v_daily_profit := inv.amount_usd * plan.daily_profit_rate;
  v_commission := inv.amount_usd * plan.commission_rate;

  -- Calculate start and end dates
  v_start_date := now();
  v_end_date := v_start_date + (plan.duration_days || ' days')::interval;

  -- Create investment record with start and end dates
  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, last_profit_update, start_date, end_date)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily_profit, p_invoice_id, NULL, v_start_date, v_end_date);

  -- Add commission to user's commission balance
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (inv.user_id, 'commission', v_commission, 'completed', p_invoice_id);

  -- Update user balance with commission
  INSERT INTO public.balances (user_id, balance, updated_at)
  VALUES (inv.user_id, v_commission, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.balances.balance + EXCLUDED.balance,
      updated_at = now();

  -- Log the approval details
  RAISE NOTICE 'Invoice % approved: Plan=%, Amount=%, Daily Profit=%, Commission=%, Duration=% days',
    p_invoice_id, inv.plan_id, inv.amount_usd, v_daily_profit, v_commission, plan.duration_days;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;

-- Update apply_daily_profits function to check investment duration
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
       AND (i.end_date IS NULL OR i.end_date > now())
  LOOP
    -- Add daily profit to user balance
    INSERT INTO public.balances (user_id, balance, updated_at)
    VALUES (r.user_id, r.daily_profit, now())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.balances.balance + EXCLUDED.balance,
        updated_at = now();

    -- Create transaction record for the profit
    INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
    VALUES (r.user_id, 'profit', r.daily_profit, 'completed', r.id);

    -- Update the investment last profit update time
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

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investment_plans' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investments' 
ORDER BY ordinal_position;

SELECT id, name, duration_days 
FROM public.investment_plans 
WHERE id IN ('GOLD PLAN', 'SILVER', 'DIAMOND');
