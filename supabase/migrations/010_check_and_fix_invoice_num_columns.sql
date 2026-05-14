-- Check for any invoice_num columns and fix them
-- This will find any tables/views that still use invoice_num instead of invoice_number

-- First, let's see what columns exist in the invoices table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'invoices' 
AND (column_name LIKE '%invoice%' OR column_name LIKE '%num%')
ORDER BY column_name;

-- Check if there are any views that reference invoice_num
SELECT table_name, view_definition 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND view_definition ILIKE '%invoice_num%';

-- Check for any tables that might have invoice_num
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'invoice_num';

-- If we find invoice_num columns, rename them to invoice_number
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'invoice_num'
    LOOP
        EXECUTE format('ALTER TABLE %I RENAME COLUMN invoice_num TO invoice_number', rec.table_name);
        RAISE NOTICE 'Renamed invoice_num to invoice_number in table %', rec.table_name;
    END LOOP;
END $$;

-- Final check to confirm the fix
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'invoices' 
AND column_name LIKE '%invoice%'
ORDER BY column_name;
