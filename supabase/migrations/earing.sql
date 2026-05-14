-- Update investment_plans table to match frontend plan names
UPDATE public.investment_plans 
SET 
  id = 'GOLD PLAN',
  name = 'GOLD PLAN',
  daily_profit_rate = 0.20,
  commission_rate = 0.05,
  minimum_amount = 500,
  maximum_amount = 1000
WHERE id = 'basic';

UPDATE public.investment_plans 
SET 
  id = 'SILVER',
  name = 'SILVER',
  daily_profit_rate = 0.25,
  commission_rate = 0.10,
  minimum_amount = 1000,
  maximum_amount = 50000
WHERE id = 'standard';

UPDATE public.investment_plans 
SET 
  id = 'DIAMOND',
  name = 'DIAMOND',
  daily_profit_rate = 0.50,
  commission_rate = 0.25,
  minimum_amount = 100000,
  maximum_amount = 1000000
WHERE id = 'premium';

-- Delete the vip plan since it's not used in frontend
DELETE FROM public.investment_plans WHERE id = 'vip';

-- Update existing investments to use new plan names
UPDATE public.investments 
SET plan_id = 'GOLD PLAN' 
WHERE plan_id = 'basic';

UPDATE public.investments 
SET plan_id = 'SILVER' 
WHERE plan_id = 'standard';

UPDATE public.investments 
SET plan_id = 'DIAMOND' 
WHERE plan_id = 'premium';

-- Update existing invoices to use new plan names
UPDATE public.invoices 
SET plan_id = 'GOLD PLAN' 
WHERE plan_id = 'basic';

UPDATE public.invoices 
SET plan_id = 'SILVER' 
WHERE plan_id = 'standard';

UPDATE public.invoices 
SET plan_id = 'DIAMOND' 
WHERE plan_id = 'premium';