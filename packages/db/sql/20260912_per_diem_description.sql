-- Apply after 20260912_per_diems.sql. Existing allowances retain their saved values.
ALTER TABLE per_diem ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
