-- Restore Commission System
-- This SQL file helps restore commission transactions if they were deleted

-- IMPORTANT: If you ran the DELETE statement from disable_commission.sql,
-- the commission transactions are permanently deleted from the database.
-- You cannot restore them unless you have a database backup.

-- Step 1: Check if commission transactions still exist
SELECT COUNT(*) as commission_transactions_count 
FROM transactions 
WHERE type = 'commission';

-- Step 2: If you have a backup, restore from backup
-- Example: pg_restore -d your_database -t transactions backup_file.sql

-- Step 3: If you need to recreate commission transactions manually,
-- you would need to insert them back based on your business logic.
-- This is an example - adjust based on your actual commission structure:

-- INSERT INTO transactions (user_id, type, amount, created_at, status)
-- SELECT 
--   user_id,
--   'commission' as type,
--   -- Calculate commission amount based on your business logic
--   -- Example: 10% of referral earnings
--   (SELECT COALESCE(SUM(amount), 0) * 0.10 
--    FROM transactions t2 
--    WHERE t2.user_id = t1.user_id 
--    AND t2.type = 'profit' 
--    AND t2.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as amount,
--   CURRENT_TIMESTAMP as created_at,
--   'completed' as status
-- FROM (SELECT DISTINCT user_id FROM profiles) t1
-- WHERE EXISTS (
--   SELECT 1 FROM transactions t3 
--   WHERE t3.user_id = t1.user_id 
--   AND t3.type = 'profit'
-- );

-- Step 4: (Optional) Remove the check constraint if it was added
-- ALTER TABLE transactions 
-- DROP CONSTRAINT IF EXISTS check_no_commission;

-- Step 5: (Optional) Remove the trigger if it was added
-- DROP TRIGGER IF EXISTS trigger_prevent_commission ON transactions;
-- DROP FUNCTION IF EXISTS prevent_commission_transactions();

-- Step 6: Verify the restoration
SELECT COUNT(*) as commission_transactions_count 
FROM transactions 
WHERE type = 'commission';

-- Notes:
-- - If you don't have a backup, commission data may be permanently lost
-- - The manual recreation example above is a template - adjust to your business logic
-- - Always test restoration queries on a staging environment first
-- - Consider implementing a soft delete system in the future instead of hard deletes
