
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    console.log('--- Setting up test data ---');
    // 1. Get a doctor and patient
    const docRes = await pool.query("SELECT * FROM users WHERE role = 'doctor' LIMIT 1");
    if (docRes.rowCount === 0) throw new Error("No doctor found");
    const docUser = docRes.rows[0];

    const patRes = await pool.query("SELECT * FROM patient_profiles LIMIT 1");
    if (patRes.rowCount === 0) throw new Error("No patient profile found");
    const patProfile = patRes.rows[0];

    // Create a dummy lab result if needed
    const labRes = await pool.query(
      `INSERT INTO lab_results (patient_id, file_url, file_name, test_type, result_date) 
       VALUES ($1, 'http://test.com/file.pdf', 'test_lab.pdf', 'CBC', CURRENT_DATE) RETURNING id`,
      [patProfile.id]
    );
    const labId = labRes.rows[0].id;

    // We don't have the password, so we'll just mock the token by signing one if possible, 
    // OR we can just use the db to verify the logic.
    // Let's just create a token since we have JWT_SECRET
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: docUser.id, role: docUser.role },
      process.env.JWT_SECRET || 'dialylink_secret_key_123!@#',
      { expiresIn: '1d' }
    );

    const makeRequest = async (method, path, body) => {
      const res = await fetch(`http://localhost:5000/api${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return { data };
    };

    console.log('--- Testing POST Prescription ---');
    const postRx = await makeRequest('POST', `/doctor/patients/${patProfile.id}/prescriptions`, {
      medication_name: 'Test Med',
      dosage: '100mg',
      frequency: 'Once daily',
      duration: '30 days',
      instructions: 'Take with food'
    });
    console.log('POST Prescription Response:', postRx.data);
    const rxId = postRx.data.data.id;

    console.log('--- Testing PATCH Prescription ---');
    const patchRx = await makeRequest('PATCH', `/doctor/patients/${patProfile.id}/prescriptions/${rxId}`, {
      is_active: false
    });
    console.log('PATCH Prescription Response:', patchRx.data);

    console.log('--- Testing PATCH Lab ---');
    const patchLab = await makeRequest('PATCH', `/doctor/patients/${patProfile.id}/labs/${labId}`, {
      doctor_notes: 'Looks good, keep monitoring.'
    });
    console.log('PATCH Lab Response:', patchLab.data);

    console.log('--- Checking Notifications ---');
    const notifs = await pool.query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2`, [patProfile.user_id]);
    console.log('Recent Notifications for Patient:', notifs.rows.map(n => n.message));

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  } finally {
    await pool.end();
  }
}

runTest();
