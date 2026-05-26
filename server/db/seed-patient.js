const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function seedPatient() {
  try {
    // 1. Get the first doctor profile
    const doctorRes = await pool.query("SELECT id FROM doctor_profiles LIMIT 1");
    if (doctorRes.rows.length === 0) {
      console.error('No doctor profile found in the database. Please create a doctor first.');
      process.exit(1);
    }
    const doctorProfileId = doctorRes.rows[0].id;
    console.log(`Found doctor profile ID: ${doctorProfileId}`);

    // 2. Create dummy patient user
    const patientEmail = 'dummy_patient@example.com';
    const passwordHash = await bcrypt.hash('password123', 12);
    
    let userId;
    const checkPatient = await pool.query('SELECT id FROM users WHERE email = $1', [patientEmail]);
    
    if (checkPatient.rows.length > 0) {
      userId = checkPatient.rows[0].id;
      console.log('Dummy patient user already exists. ID:', userId);
    } else {
      const insertPatient = await pool.query(
        `INSERT INTO users (email, password_hash, role, full_name, is_verified) 
         VALUES ($1, $2, 'patient', 'John Doe (Dummy Patient)', true) RETURNING id`,
        [patientEmail, passwordHash]
      );
      userId = insertPatient.rows[0].id;
      console.log('Created dummy patient user. ID:', userId);
    }

    // 3. Create Patient Profile
    let patientProfileId;
    const checkProfile = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [userId]);
    if (checkProfile.rows.length > 0) {
      patientProfileId = checkProfile.rows[0].id;
      await pool.query(
        `UPDATE patient_profiles SET connected_doctor_id = $1 WHERE id = $2`,
        [doctorProfileId, patientProfileId]
      );
      console.log('Patient profile updated. ID:', patientProfileId);
    } else {
      const insertProfile = await pool.query(
        `INSERT INTO patient_profiles (user_id, date_of_birth, blood_type, connected_doctor_id, doctor_notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, '1980-05-15', 'O+', doctorProfileId, 'Patient has a history of mild hypertension. Ensure regular BP checks during sessions.']
      );
      patientProfileId = insertProfile.rows[0].id;
      console.log('Patient profile created. ID:', patientProfileId);
    }

    // 4. Add a recent session
    await pool.query(
      `INSERT INTO dialysis_sessions (patient_id, session_date, duration_minutes, weight_before, weight_after, bp_before, bp_after, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [patientProfileId, new Date(Date.now() - 86400000).toISOString(), 240, 75.5, 73.2, '135/85', '120/80', 'Smooth session. No complications.']
    );

    // 5. Add some labs
    await pool.query(
      `INSERT INTO lab_results (patient_id, test_type, result_date, file_name, file_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [patientProfileId, 'comprehensive_metabolic_panel', new Date(Date.now() - 86400000 * 5).toISOString(), 'cmp_results.pdf', 'https://example.com/cmp.pdf']
    );

    // 6. Add prescriptions
    // Note: prescriptions table does not have 'status' column in schema.sql. Removing 'status'.
    await pool.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, frequency, instructions)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [patientProfileId, doctorProfileId, 'Lisinopril', '10mg', 'Once daily', 'Take in the morning with food.']
    );

    console.log('Dummy data successfully seeded! You can now view this patient in the doctor dashboard.');

  } catch (error) {
    console.error('Error seeding patient:', error);
  } finally {
    await pool.end();
  }
}

seedPatient();
