-- Restore investment duration tracking
-- This migration fixes the broken duration tracking from migration 018

-- Step 1: Ensure duration_days column exists in investment_plans
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
  END IF;
END $$;

-- Step 2: Update investment plans with correct durations
UPDATE public.investment_plans 
SET duration_days = 5
WHERE id = 'GOLD PLAN' AND (duration_days IS NULL OR duration_days = 0);

UPDATE public.investment_plans 
SET duration_days = 4
WHERE id = 'SILVER' AND (duration_days IS NULL OR duration_days = 0);

UPDATE public.investment_plans 
SET duration_days = 3
WHERE id = 'DIAMOND' AND (duration_days IS NULL OR duration_days = 0);

-- Step 3: Update approve_invoice function to calculate end_date based on plan duration
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
  
  -- Calculate start and end dates based on plan duration
  v_start_date := now();
  v_end_date := v_start_date + (plan.duration_days || ' days')::interval;

  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, created_at, last_profit_update, start_date, end_date)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily_profit, p_invoice_id, now(), NULL, v_start_date, v_end_date);

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

-- Step 4: Update apply_daily_profits to properly check end_date
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
       AND (i.end_date IS NULL OR i.end_date > now())
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

-- Step 5: Verify the changes
SELECT id, name, duration_days 
FROM public.investment_plans 
WHERE id IN ('GOLD PLAN', 'SILVER', 'DIAMOND');
