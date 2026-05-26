-- Seed a dummy patient for testing the Patient Portal
-- Email: patient@dialylink.com
-- Password: password123

-- 1. Insert into users table
INSERT INTO users (id, email, password_hash, role, full_name, phone, is_verified) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'patient@dialylink.com', 
  '$2b$10$RMMZT/Fsr2A3aMCDudWriulX1Sa1fvzvv6uFD5BnBTCEn6ECcAHQq', 
  'patient', 
  'John Patient', 
  '555-1234', 
  true
)
ON CONFLICT (email) DO NOTHING;

-- 2. Insert into patient_profiles table
INSERT INTO patient_profiles (user_id, date_of_birth, blood_type, address)
VALUES (
  (SELECT id FROM users WHERE email = 'patient@dialylink.com'),
  '1985-05-15',
  'O+',
  '123 Dialysis Lane, Medical City'
)
ON CONFLICT (user_id) DO NOTHING;
