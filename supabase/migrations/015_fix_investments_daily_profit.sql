-- Fix missing daily_profit column in investments table
-- This migration ensures all required columns exist for the investment system

-- Add daily_profit column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'daily_profit'
  ) THEN
    ALTER TABLE public.investments ADD COLUMN daily_profit numeric CHECK (daily_profit >= 0);
    RAISE NOTICE 'Added daily_profit column to investments table';
  ELSE
    RAISE NOTICE 'daily_profit column already exists in investments table';
  END IF;
END $$;

-- Add last_profit_update column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'last_profit_update'
  ) THEN
    ALTER TABLE public.investments ADD COLUMN last_profit_update timestamptz;
    RAISE NOTICE 'Added last_profit_update column to investments table';
  ELSE
    RAISE NOTICE 'last_profit_update column already exists in investments table';
  END IF;
END $$;

-- Verify the investments table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investments' 
ORDER BY ordinal_position;
