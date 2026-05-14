-- Fix potential column name mismatch: invoice_num vs invoice_number
-- Run this if you're getting "invoice_num" errors but the column should be "invoice_number"

DO $$
BEGIN
  -- Check if invoice_num column exists and rename it to invoice_number
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_num'
  ) THEN
    ALTER TABLE public.invoices RENAME COLUMN invoice_num TO invoice_number;
  END IF;
END $$;

-- Ensure the invoice_number column exists and is properly set up
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number text;

-- Backfill any NULL invoice_numbers with generated values
UPDATE public.invoices 
SET invoice_number = 'INV-' || to_char(created_at AT TIME ZONE 'utc', 'YYYYMMDD') || '-' || upper(substring(md5(id::text) from 1 for 6))
WHERE invoice_number IS NULL;

-- Ensure NOT NULL constraint
ALTER TABLE public.invoices ALTER COLUMN invoice_number SET NOT NULL;

-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_unique ON public.invoices(invoice_number);

NOTIFY pgrst, 'reload schema';
