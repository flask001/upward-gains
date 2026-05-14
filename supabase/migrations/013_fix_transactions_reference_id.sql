-- Fix missing reference_id column in transactions table
-- This migration ensures the reference_id column exists for invoice approval

-- First, check if the reference_id column exists in transactions table
DO $$
BEGIN
  -- Add reference_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN reference_id uuid;
    RAISE NOTICE 'Added reference_id column to transactions table';
  ELSE
    RAISE NOTICE 'reference_id column already exists in transactions table';
  END IF;
END $$;

-- Verify the transactions table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'transactions' 
ORDER BY ordinal_position;

-- Also ensure the approve_invoice function is working correctly
-- The function should create a transaction with reference_id pointing to the invoice
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'approve_invoice';
