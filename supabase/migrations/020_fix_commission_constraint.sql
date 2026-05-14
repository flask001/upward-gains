-- ---------------------------------------------------------------------------
-- Fix commission constraint and logic
-- ---------------------------------------------------------------------------
-- This migration fixes the transactions table constraint to allow 'commission' type
-- and ensures the approve_invoice function properly creates commission transactions.

-- Step 1: Update transactions table constraint to allow commission type
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'profit', 'commission'));

-- Step 2: Update approve_invoice function to include commission logic
DROP FUNCTION IF EXISTS public.approve_invoice(uuid);

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

  -- Calculate commission based on investment plan
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

  -- Update user balance with commission
  INSERT INTO public.balances (user_id, balance, updated_at)
  VALUES (inv.user_id, v_commission, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.balances.balance + EXCLUDED.balance,
      updated_at = now();

  v_daily := inv.amount_usd * 0.20;

  INSERT INTO public.investments (user_id, plan_id, amount, daily_profit, invoice_id, last_profit_update)
  VALUES (inv.user_id, inv.plan_id, inv.amount_usd, v_daily, p_invoice_id, NULL);

  -- Log commission details
  RAISE NOTICE 'Invoice % approved: Plan=%, Amount=%, Daily Profit=%, Commission=%',
    p_invoice_id, inv.plan_id, inv.amount_usd, v_daily, v_commission;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO service_role;

-- Ask PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
