ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS hospital_affiliation VARCHAR(255);
