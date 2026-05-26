-- Add status and rejection_reason to doctor_profiles
ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add is_suspended to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
