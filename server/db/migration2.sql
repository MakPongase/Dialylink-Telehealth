ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS hospital_affiliation VARCHAR(255);

ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0;

ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS prc_doc_url TEXT;
