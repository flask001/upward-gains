-- Improve investment plan logic with dynamic rates and commission calculations
-- This migration enhances the approve_invoice function to handle different investment plans

-- First, create an investment_plans table to store plan configurations
CREATE TABLE IF NOT EXISTS public.investment_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  daily_profit_rate numeric NOT NULL CHECK (daily_profit_rate >= 0), -- e.g., 0.20 for 20%
  commission_rate numeric NOT NULL CHECK (commission_rate >= 0), -- e.g., 0.05 for 5%
  minimum_amount numeric NOT NULL CHECK (minimum_amount > 0),
  maximum_amount numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default investment plans
INSERT INTO public.investment_plans (id, name, daily_profit_rate, commission_rate, minimum_amount, maximum_amount)
VALUES
  ('basic', 'Basic Plan', 0.15, 0.03, 100, 999),
  ('standard', 'Standard Plan', 0.20, 0.05, 1000, 4999),
  ('premium', 'Premium Plan', 0.25, 0.08, 5000, 19999),
  ('vip', 'VIP Plan', 0.30, 0.10, 20000, NULL)
ON CONFLICT (id) DO NOTHING;

-- Update the approve_invoice function to use dynamic rates
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

  -- Create investment record
  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, last_profit_update)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily_profit, p_invoice_id, NULL);

  -- Add commission to user's commission balance (if you have a separate commission table)
  -- For now, we'll add it to the main balance but mark it as commission in transactions
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id)
  VALUES (inv.user_id, 'commission', v_commission, 'completed', p_invoice_id);

  -- Update user balance with commission
  INSERT INTO public.balances (user_id, balance, updated_at)
  VALUES (inv.user_id, v_commission, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.balances.balance + EXCLUDED.balance,
      updated_at = now();

  -- Log the approval details
  RAISE NOTICE 'Invoice % approved: Plan=%, Amount=%, Daily Profit=%, Commission=%',
    p_invoice_id, inv.plan_id, inv.amount_usd, v_daily_profit, v_commission;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;

-- Also update the daily profit function to use the correct rates
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
