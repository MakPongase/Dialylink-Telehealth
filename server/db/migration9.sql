-- Migration 9: Add Interdialytic Weight Gain (IDWG)
ALTER TABLE dialysis_sessions ADD COLUMN IF NOT EXISTS idwg_kg NUMERIC(5,2);
