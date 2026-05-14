-- Fix plan_id type mismatch in investments table
-- The plan_id should be text to match investment_plans.id and invoices.plan_id

-- First, check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investments' 
ORDER BY ordinal_position;

-- Check invoices table plan_id type
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'invoices' 
AND column_name = 'plan_id';

-- Check investment_plans table id type
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investment_plans' 
AND column_name = 'id';

-- If plan_id in investments is uuid, convert it to text
DO $$
BEGIN
  -- Check if plan_id column exists and is uuid type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'plan_id'
    AND data_type = 'uuid'
  ) THEN
    -- Drop existing investments if any (since we're changing the data type)
    DELETE FROM public.investments;
    
    -- Alter column type from uuid to text
    ALTER TABLE public.investments ALTER COLUMN plan_id TYPE text;
    RAISE NOTICE 'Changed plan_id from uuid to text in investments table';
  ELSE
    RAISE NOTICE 'plan_id column is already text or does not exist';
  END IF;
END $$;

-- Ensure all required columns exist
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

-- Verify final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investments' 
ORDER BY ordinal_position;
