-- Drop invoice_num column if it exists (since invoice_number already exists)
-- This fixes the column name conflict causing the error

DO $$
BEGIN
  -- Check if invoice_num column exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_num'
  ) THEN
    ALTER TABLE public.invoices DROP COLUMN invoice_num;
    RAISE NOTICE 'Dropped invoice_num column from invoices table';
  END IF;
END $$;

-- Verify the current state of invoice-related columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'invoices' 
AND (column_name LIKE '%invoice%' OR column_name LIKE '%num%')
ORDER BY column_name;
