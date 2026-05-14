-- STEP 1 — Run this ALONE in Supabase SQL Editor (one batch).
-- Adds missing columns WITHOUT SET NOT NULL so nothing late in the script can roll back DDL.
-- Fixes: PGRST204 amount_usd, 42703 plan_id (schema cache updates via NOTIFY).

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS wallet_type text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_usd numeric;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS crypto_amount numeric;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_address text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_profit_update timestamptz;

-- FK may fail if invoices table structure is unusual; run 003_fix first if needed.
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS investments_one_per_invoice
  ON public.investments(invoice_id)
  WHERE invoice_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- After this succeeds: run 006_step2_invoice_rpc_functions.sql in a NEW query tab.
