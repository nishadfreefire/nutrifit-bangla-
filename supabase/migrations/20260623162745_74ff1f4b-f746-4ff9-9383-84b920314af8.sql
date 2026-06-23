ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS weekly_change_kg numeric;