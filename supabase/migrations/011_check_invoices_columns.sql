-- Check all columns in the invoices table to understand the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'invoices'
ORDER BY ordinal_position;
