-- Run once in Supabase SQL Editor to support the TradeLog reference's review analytics.
-- Existing trade rows remain valid; new review fields are optional.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS setup text,
  ADD COLUMN IF NOT EXISTS emotion text,
  ADD COLUMN IF NOT EXISTS quality_score smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trades_quality_score_range'
      AND conrelid = 'public.trades'::regclass
  ) THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_quality_score_range
      CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 4);
  END IF;
END
$$;
