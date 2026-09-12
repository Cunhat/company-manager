-- For databases that already applied an earlier version of 20260912_per_diems.sql.
-- Leave legacy direction unknown: business-purpose text is not a reliable marker.
ALTER TABLE "journey" ADD COLUMN IF NOT EXISTS "is_return" boolean;
