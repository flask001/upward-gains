-- OPTIONAL — Run only after 005 + 006 succeed and the app can insert/select invoices.
-- Backfills NULLs and tightens NOT NULL. If any line errors, fix data for offending rows and re-run.

UPDATE public.invoices SET plan_id = 'UNKNOWN' WHERE plan_id IS NULL OR trim(plan_id) = '';
UPDATE public.invoices SET wallet_type = 'Bitcoin' WHERE wallet_type IS NULL OR trim(wallet_type) = '';
UPDATE public.invoices SET amount_usd = 0.01 WHERE amount_usd IS NULL;
UPDATE public.invoices SET crypto_amount = 0 WHERE crypto_amount IS NULL;
UPDATE public.invoices SET status = 'pending' WHERE status IS NULL OR trim(status) = '';
UPDATE public.invoices SET invoice_number = 'INV-MIGR-' || replace(id::text, '-', '')
WHERE invoice_number IS NULL OR trim(invoice_number) = '';
UPDATE public.invoices SET payment_address = 'CONFIGURE_IN_SUPABASE_DASHBOARD'
WHERE payment_address IS NULL OR trim(payment_address) = '';
UPDATE public.invoices SET created_at = now() WHERE created_at IS NULL;

ALTER TABLE public.invoices ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN wallet_type SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN amount_usd SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN crypto_amount SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN invoice_number SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN payment_address SET NOT NULL;

NOTIFY pgrst, 'reload schema';
