-- Fix the amount column issue
-- Check if there's an amount column that needs to be handled

-- First, let's see if there's an amount column that's not showing up
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'invoices' 
AND column_name IN ('amount', 'amount_usd')
ORDER BY column_name;

-- If there's an amount column, let's drop it since we use amount_usd
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.invoices DROP COLUMN amount;
    RAISE NOTICE 'Dropped amount column from invoices table';
  END IF;
END $$;

-- Update the admin_create_invoice function to ensure it uses the right columns
DROP FUNCTION IF EXISTS public.admin_create_invoice(uuid, text, text, numeric, numeric, text);

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
    RAISE EXCEPTION 'forbidden: user is not admin';
  END IF;

  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  IF p_plan_id IS NULL OR trim(p_plan_id) = '' THEN
    RAISE EXCEPTION 'plan_id cannot be null or empty';
  END IF;
  
  IF p_wallet_type IS NULL OR trim(p_wallet_type) = '' THEN
    RAISE EXCEPTION 'wallet_type cannot be null or empty';
  END IF;
  
  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'amount_usd must be greater than 0';
  END IF;
  
  IF p_crypto_amount IS NULL OR p_crypto_amount < 0 THEN
    RAISE EXCEPTION 'crypto_amount cannot be negative';
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

  -- Generate unique invoice number
  v_number := 'INV-' || to_char(now() AT TIME ZONE 'utc', 'YYYYMMDD') || '-'
    || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  -- Ensure invoice_number is unique
  WHILE EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = v_number) LOOP
    v_number := 'INV-' || to_char(now() AT TIME ZONE 'utc', 'YYYYMMDD') || '-'
      || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  END LOOP;

  -- Insert with explicit column names to avoid confusion
  INSERT INTO public.invoices (
    user_id, 
    plan_id, 
    wallet_type, 
    amount_usd, 
    crypto_amount,
    status, 
    invoice_number, 
    payment_address,
    created_at
  )
  VALUES (
    p_user_id, 
    p_plan_id, 
    p_wallet_type, 
    p_amount_usd, 
    p_crypto_amount,
    'pending', 
    v_number, 
    v_address,
    now()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating invoice: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_invoice(uuid, text, text, numeric, numeric, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
