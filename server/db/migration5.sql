DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS prescription_groups CASCADE;

-- Prescription Groups table
CREATE TABLE prescription_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE NOT NULL,
    consultation_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES prescription_groups(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100),
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
