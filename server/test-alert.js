async function testAlerts() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_iHlGn0AXKaB7@ep-soft-block-aorz6k8p.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });
    
    const res = await pool.query(`
      SELECT p.user_id as patient_user_id, d.user_id as doctor_user_id, u.full_name as pat_name
      FROM patient_profiles p 
      JOIN doctor_profiles d ON p.connected_doctor_id = d.id 
      JOIN users u ON p.user_id = u.id
      LIMIT 1
    `);
    
    if (res.rowCount === 0) {
      console.log('No connected patient-doctor pair found. Seed first.');
      return;
    }

    const { patient_user_id, doctor_user_id, pat_name } = res.rows[0];
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'Dialylink_2026_secret_duper_key'; 
    
    const patientToken = jwt.sign({ id: patient_user_id, role: 'patient' }, JWT_SECRET, { expiresIn: '1h' });
    const doctorToken = jwt.sign({ id: doctor_user_id, role: 'doctor' }, JWT_SECRET, { expiresIn: '1h' });

    console.log('Logging dialysis session with high BP...');
    
    const sessionRes = await fetch('http://localhost:5000/api/patient/monitoring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        session_date: new Date().toISOString().split('T')[0],
        bp_before: '120/80',
        bp_after: '185/95', // Trigger BP Alert
        weight_before: '70.5',
        weight_after: '68.5',
        fluid_intake_ml: 1000,
        duration_minutes: 240,
        symptoms: ['headache'],
        notes: 'Testing high BP alert'
      })
    });
    
    const sessionData = await sessionRes.json();
    console.log('Session logged:', sessionData.success);

    console.log('Fetching doctor dashboard patients...');
    
    const docRes = await fetch('http://localhost:5000/api/doctor/patients', {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const docData = await docRes.json();
    
    const patients = docData.data;
    const testPatient = patients.find(p => p.user_id === patient_user_id);
    
    console.log(`Alert Flags for Patient ${testPatient.name}:`, testPatient.alert_flags);
    if (testPatient.alert_flags.bp_alert === true) {
      console.log('✅ TEST PASSED: bp_alert is true!');
    } else {
      console.log('❌ TEST FAILED: bp_alert is false.');
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testAlerts();
