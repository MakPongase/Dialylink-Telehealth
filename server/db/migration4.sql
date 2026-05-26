-- Add is_active to prescriptions table
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
