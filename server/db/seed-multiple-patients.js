const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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

const PATIENTS = [
  { email: 'sarah.j@example.com', name: 'Sarah Johnson', dob: '1975-08-22', bloodType: 'A+', type: 'hemodialysis' },
  { email: 'mike.t@example.com', name: 'Michael Thompson', dob: '1962-11-05', bloodType: 'O-', type: 'hemodialysis' },
  { email: 'elena.r@example.com', name: 'Elena Rodriguez', dob: '1988-03-14', bloodType: 'B+', type: 'peritoneal' }
];

async function seedMultiplePatients() {
  try {
    const doctorRes = await pool.query("SELECT id FROM doctor_profiles LIMIT 1");
    if (doctorRes.rows.length === 0) {
      console.error('No doctor profile found in the database. Please create a doctor first.');
      process.exit(1);
    }
    const doctorProfileId = doctorRes.rows[0].id;
    const passwordHash = await bcrypt.hash('password123', 12);

    for (const patient of PATIENTS) {
      let userId;
      const checkPatient = await pool.query('SELECT id FROM users WHERE email = $1', [patient.email]);
      
      if (checkPatient.rows.length > 0) {
        userId = checkPatient.rows[0].id;
        console.log(`User ${patient.name} already exists. ID:`, userId);
      } else {
        const insertPatient = await pool.query(
          `INSERT INTO users (email, password_hash, role, full_name, is_verified) 
           VALUES ($1, $2, 'patient', $3, true) RETURNING id`,
          [patient.email, passwordHash, patient.name]
        );
        userId = insertPatient.rows[0].id;
        console.log(`Created user ${patient.name}. ID:`, userId);
      }

      let patientProfileId;
      const checkProfile = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [userId]);
      if (checkProfile.rows.length > 0) {
        patientProfileId = checkProfile.rows[0].id;
        await pool.query(
          `UPDATE patient_profiles SET connected_doctor_id = $1 WHERE id = $2`,
          [doctorProfileId, patientProfileId]
        );
      } else {
        const insertProfile = await pool.query(
          `INSERT INTO patient_profiles (user_id, date_of_birth, blood_type, connected_doctor_id)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [userId, patient.dob, patient.bloodType, doctorProfileId]
        );
        patientProfileId = insertProfile.rows[0].id;
      }

      // Add 15 historical sessions
      for (let i = 15; i >= 1; i--) {
        const sessionDate = new Date(Date.now() - (i * 2 * 86400000)); // Every 2 days
        const weightBefore = 70 + (Math.random() * 4); // 70 to 74
        const weightAfter = weightBefore - (1.5 + Math.random()); // Drop 1.5 to 2.5
        const idwg = (Math.random() * 3).toFixed(2); // 0 to 3
        const bpSysBefore = Math.floor(130 + Math.random() * 30);
        const bpDiaBefore = Math.floor(80 + Math.random() * 15);
        const bpSysAfter = Math.floor(110 + Math.random() * 20);
        const bpDiaAfter = Math.floor(70 + Math.random() * 10);
        
        await pool.query(
          `INSERT INTO dialysis_sessions (patient_id, session_date, duration_minutes, weight_before, weight_after, bp_before, bp_after, notes, idwg_kg, dialysis_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            patientProfileId, 
            sessionDate.toISOString(), 
            240, 
            weightBefore.toFixed(1), 
            weightAfter.toFixed(1), 
            `${bpSysBefore}/${bpDiaBefore}`, 
            `${bpSysAfter}/${bpDiaAfter}`, 
            `Historical session ${16 - i}`,
            idwg,
            patient.type
          ]
        );
      }
      console.log(`Added 15 sessions for ${patient.name}`);
    }
    
    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding patient:', error);
  } finally {
    await pool.end();
  }
}

seedMultiplePatients();
