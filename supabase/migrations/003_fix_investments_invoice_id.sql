-- Run this if migration stopped at: column "invoice_id" does not exist
-- (investments table existed without invoice_id from an earlier partial run).

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS investments_one_per_invoice
  ON public.investments(invoice_id)
  WHERE invoice_id IS NOT NULL;
