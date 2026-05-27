const { sendNotification } = require("../utils/notify");
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, checkRole } = require('../middleware/auth');

// Protect all routes under /api/doctor with verifyToken and checkRole(['doctor'])
router.use(verifyToken, checkRole(['doctor']));

// Helper to generate unique 6-char alphanumeric connection code
async function generateConnectionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const res = await pool.query('SELECT 1 FROM doctor_profiles WHERE connection_code = $1', [code]);
    if (res.rowCount === 0) {
      isUnique = true;
    }
    attempts++;
  }
  return code;
}

// GET /patients
router.get('/patients', async (req, res) => {
  try {
    // Get doctor's profile ID
    const docProfileRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
    if (docProfileRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }
    const doctorProfileId = docProfileRes.rows[0].id;

    // Get patients connected to this doctor
    const patientsRes = await pool.query(
      `SELECT 
        pp.id as patient_profile_id,
        u.id as user_id,
        u.full_name as name,
        u.profile_photo_url,
        (SELECT session_date FROM dialysis_sessions WHERE patient_id = pp.id ORDER BY session_date DESC, logged_at DESC LIMIT 1) as last_session_date,
        (SELECT bp_after FROM dialysis_sessions WHERE patient_id = pp.id ORDER BY session_date DESC, logged_at DESC LIMIT 1) as last_bp_after,
        (SELECT weight_before FROM dialysis_sessions WHERE patient_id = pp.id ORDER BY session_date DESC, logged_at DESC LIMIT 1) as last_weight_before,
        (SELECT weight_after FROM dialysis_sessions WHERE patient_id = pp.id ORDER BY session_date DESC, logged_at DESC LIMIT 1 OFFSET 1) as prev_weight_after
      FROM patient_profiles pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.connected_doctor_id = $1`,
      [doctorProfileId]
    );

    const patients = patientsRes.rows.map(row => {
      let bpAlert = false;
      let weightAlert = false;

      // Parse BP Alert
      if (row.last_bp_after) {
        const systolic = parseInt(row.last_bp_after.split('/')[0], 10);
        if (!isNaN(systolic) && (systolic > 180 || systolic < 90)) {
          bpAlert = true;
        }
      }

      // Parse Weight Alert (weight gain > 2.0 kg between sessions)
      if (row.last_weight_before && row.prev_weight_after) {
        const weightGain = parseFloat(row.last_weight_before) - parseFloat(row.prev_weight_after);
        if (!isNaN(weightGain) && weightGain > 2.0) {
          weightAlert = true;
        }
      }

      return {
        id: row.patient_profile_id,
        user_id: row.user_id,
        name: row.name,
        profile_photo_url: row.profile_photo_url,
        last_session_date: row.last_session_date,
        alert_flags: {
          bp_alert: bpAlert,
          weight_alert: weightAlert
        }
      };
    });

    return res.json({ success: true, data: patients });

  } catch (error) {
    console.error('Error fetching patients:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching patients list.' });
  }
});

// GET /patients/:id
router.get('/patients/:id', async (req, res) => {
  const patientProfileId = req.params.id;

  try {
    // 1. Get user and profile details
    const patientRes = await pool.query(
      `SELECT 
        pp.id as patient_profile_id,
        pp.date_of_birth,
        pp.blood_type,
        pp.address,
        pp.emergency_contact_name,
        pp.emergency_contact_phone,
        pp.doctor_notes,
        u.id as user_id,
        u.email,
        u.full_name as name,
        u.phone,
        u.profile_photo_url
      FROM patient_profiles pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.id = $1`,
      [patientProfileId]
    );

    if (patientRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const patientInfo = patientRes.rows[0];

    // 2. Get last 5 dialysis sessions
    const sessionsRes = await pool.query(
      `SELECT * FROM dialysis_sessions 
       WHERE patient_id = $1 
       ORDER BY session_date DESC, logged_at DESC 
       LIMIT 5`,
      [patientProfileId]
    );

    // 3. Get active prescriptions
    const prescriptionsRes = await pool.query(
      `SELECT * FROM prescriptions 
       WHERE patient_id = $1 
       ORDER BY issued_at DESC`,
      [patientProfileId]
    );

    // 4. Get lab results list
    const labsRes = await pool.query(
      `SELECT * FROM lab_results 
       WHERE patient_id = $1 
       ORDER BY result_date DESC, uploaded_at DESC`,
      [patientProfileId]
    );

    // 5. Get recent consultations
    const consultationsRes = await pool.query(
      `SELECT * FROM appointments 
       WHERE patient_id = $1 AND type = 'consultation'
       ORDER BY scheduled_at DESC 
       LIMIT 10`,
      [patientProfileId]
    );

    // 6. Get doctor's signature
    const doctorRes = await pool.query(
      `SELECT signature_url FROM doctor_profiles WHERE user_id = $1`,
      [req.user.id]
    );
    const doctorSignature = doctorRes.rows[0]?.signature_url || null;

    return res.json({
      success: true,
      data: {
        profile: patientInfo,
        sessions: sessionsRes.rows,
        prescriptions: prescriptionsRes.rows,
        labs: labsRes.rows,
        consultations: consultationsRes.rows,
        doctorSignature
      }
    });

  } catch (error) {
    console.error('Error fetching patient details:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching patient details.' });
  }
});

// PUT /patients/:id/notes
router.put('/patients/:id/notes', async (req, res) => {
  const patientProfileId = req.params.id;
  const { notes } = req.body;

  try {
    const updateRes = await pool.query(
      'UPDATE patient_profiles SET doctor_notes = $1 WHERE id = $2 RETURNING id, doctor_notes',
      [notes, patientProfileId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    return res.json({
      success: true,
      data: updateRes.rows[0],
      message: 'Doctor notes updated successfully.'
    });

  } catch (error) {
    console.error('Error updating patient notes:', error);
    return res.status(500).json({ success: false, message: 'Server error updating doctor notes.' });
  }
});

// GET /connection-code
router.get('/connection-code', async (req, res) => {
  try {
    const docRes = await pool.query(
      'SELECT connection_code FROM doctor_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.json({
      success: true,
      data: { connection_code: docRes.rows[0].connection_code }
    });

  } catch (error) {
    console.error('Error fetching connection code:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching connection code.' });
  }
});

// POST /connection-code/regenerate
router.post('/connection-code/regenerate', async (req, res) => {
  try {
    const newCode = await generateConnectionCode();

    const updateRes = await pool.query(
      'UPDATE doctor_profiles SET connection_code = $1 WHERE user_id = $2 RETURNING connection_code',
      [newCode, req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.json({
      success: true,
      data: { connection_code: updateRes.rows[0].connection_code },
      message: 'Connection code regenerated successfully.'
    });

  } catch (error) {
    console.error('Error regenerating connection code:', error);
    return res.status(500).json({ success: false, message: 'Server error regenerating connection code.' });
  }
});

const PDFDocument = require('pdfkit');

// GET /patients/:id/prescriptions
router.get('/patients/:id/prescriptions', async (req, res) => {
  const patientProfileId = req.params.id;

  try {
    const groupsRes = await pool.query(
      `SELECT * FROM prescription_groups 
       WHERE patient_id = $1 
       ORDER BY issued_at DESC`,
      [patientProfileId]
    );

    const groups = groupsRes.rows;

    if (groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      const medsRes = await pool.query(
        `SELECT * FROM prescriptions 
         WHERE group_id = ANY($1) 
         ORDER BY issued_at ASC`,
        [groupIds]
      );

      const meds = medsRes.rows;
      groups.forEach(g => {
        g.medications = meds.filter(m => m.group_id === g.id);
      });
    }

    return res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching prescriptions.' });
  }
});

// POST /patients/:id/prescriptions
router.post('/patients/:id/prescriptions', async (req, res) => {
  const patientProfileId = req.params.id;
  const { medications, consultation_id, notes, signature_url } = req.body;

  if (!medications || !Array.isArray(medications) || medications.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one medication is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get doctor profile id
    const docRes = await client.query('SELECT id, user_id, (SELECT full_name FROM users WHERE id = doctor_profiles.user_id) as doctor_name FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
    if (docRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }
    const doctorProfileId = docRes.rows[0].id;
    const doctorName = docRes.rows[0].doctor_name;

    // Get patient user id for notification
    const patRes = await client.query('SELECT user_id FROM patient_profiles WHERE id = $1', [patientProfileId]);
    if (patRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }
    const patientUserId = patRes.rows[0].user_id;

    // Insert prescription group
    const groupRes = await client.query(
      `INSERT INTO prescription_groups (patient_id, doctor_id, consultation_id, notes, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [patientProfileId, doctorProfileId, consultation_id || null, notes]
    );
    const group = groupRes.rows[0];

    // Insert medications
    const insertedMeds = [];
    for (const med of medications) {
      const medRes = await client.query(
        `INSERT INTO prescriptions (group_id, patient_id, doctor_id, medication_name, dosage, frequency, duration, instructions, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
        [group.id, patientProfileId, doctorProfileId, med.medication_name, med.dosage, med.frequency, med.duration, med.instructions]
      );
      insertedMeds.push(medRes.rows[0]);
    }
    group.medications = insertedMeds;

    // Update doctor's signature if provided
    if (signature_url) {
      await client.query(
        `UPDATE doctor_profiles SET signature_url = $1 WHERE id = $2`,
        [signature_url, doctorProfileId]
      );
    }

    // Insert notification
    await sendNotification({ user_id: patientUserId, type: 'new_prescription', message: `Dr. ${doctorName} has issued a prescription with ${medications.length} medication(s).` });

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: group,
      message: 'Prescription issued successfully.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating prescription:', error);
    return res.status(500).json({ success: false, message: 'Server error creating prescription.' });
  } finally {
    client.release();
  }
});


// PATCH /prescriptions/:groupId/deactivate
router.patch('/prescriptions/:groupId/deactivate', async (req, res) => {
  const { groupId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const updateRes = await client.query(
      'UPDATE prescription_groups SET is_active = false WHERE id = $1 RETURNING *',
      [groupId]
    );

    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Prescription group not found.' });
    }

    const group = updateRes.rows[0];

    // Deactivate all individual meds in group
    await client.query('UPDATE prescriptions SET is_active = false WHERE group_id = $1', [groupId]);

    // Get patient user id and doctor name for notification
    const patRes = await client.query('SELECT user_id FROM patient_profiles WHERE id = $1', [group.patient_id]);
    const docRes = await client.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    
    if (patRes.rowCount > 0 && docRes.rowCount > 0) {
      await sendNotification({ user_id: patRes.rows[0].user_id, type: 'prescription_update', message: `A prescription from Dr. ${docRes.rows[0].full_name} has been discontinued.` });
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Prescription group discontinued.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deactivating prescription group:', error);
    return res.status(500).json({ success: false, message: 'Server error deactivating prescription.' });
  } finally {
    client.release();
  }
});

// PATCH /prescriptions/medications/:rxId/deactivate-one
router.patch('/prescriptions/medications/:rxId/deactivate-one', async (req, res) => {
  const { rxId } = req.params;

  try {
    const updateRes = await pool.query(
      'UPDATE prescriptions SET is_active = false WHERE id = $1 RETURNING *',
      [rxId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Medication not found.' });
    }

    return res.json({ success: true, message: 'Medication discontinued.' });
  } catch (error) {
    console.error('Error deactivating medication:', error);
    return res.status(500).json({ success: false, message: 'Server error deactivating medication.' });
  }
});

// GET /patients/:id/prescriptions/:groupId/pdf
router.get('/patients/:id/prescriptions/:groupId/pdf', async (req, res) => {
  const { id: patientProfileId, groupId } = req.params;

  try {
    // 1. Fetch Doctor Profile
    const docRes = await pool.query(
      `SELECT u.full_name, dp.license_number, dp.specialization, dp.signature_url 
       FROM doctor_profiles dp JOIN users u ON dp.user_id = u.id 
       WHERE u.id = $1`, [req.user.id]
    );
    if (docRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    const doctor = docRes.rows[0];

    // 2. Fetch Patient Profile
    const patRes = await pool.query(
      `SELECT u.full_name, pp.date_of_birth, pp.blood_type 
       FROM patient_profiles pp JOIN users u ON pp.user_id = u.id 
       WHERE pp.id = $1`, [patientProfileId]
    );
    if (patRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
    const patient = patRes.rows[0];

    // Calculate age
    let age = 'N/A';
    if (patient.date_of_birth) {
      const dob = new Date(patient.date_of_birth);
      const diffMs = Date.now() - dob.getTime();
      const ageDt = new Date(diffMs);
      age = Math.abs(ageDt.getUTCFullYear() - 1970);
    }

    // 3. Fetch Prescription Group & Meds
    const groupRes = await pool.query(`SELECT * FROM prescription_groups WHERE id = $1 AND patient_id = $2`, [groupId, patientProfileId]);
    if (groupRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Prescription group not found.' });
    const group = groupRes.rows[0];

    const medsRes = await pool.query(`SELECT * FROM prescriptions WHERE group_id = $1 ORDER BY issued_at ASC`, [groupId]);
    const meds = medsRes.rows;

    // 4. Generate PDF
    const doc = new PDFDocument({ size: 'A5', margin: 30 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${groupId.substring(0,8)}.pdf"`);
    
    doc.pipe(res);

    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).strokeColor('#d1d5db').stroke();

    // Header
    doc.fillColor('#1f2937').fontSize(14).font('Helvetica-Bold').text(`DR. ${doctor.full_name.toUpperCase()}`, 40, 40);
    doc.fontSize(10).font('Helvetica').text(`${doctor.specialization || 'Nephrology'} • PRC Lic. No. ${doctor.license_number}`);
    doc.text('DialyLink Digital Consultation');
    
    const issuedDate = new Date(group.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.fontSize(10).text(issuedDate, doc.page.width - 120, 40, { align: 'right' });

    // Divider
    doc.moveTo(40, 90).lineTo(doc.page.width - 40, 90).strokeColor('#e5e7eb').stroke();

    // Patient Info
    doc.moveDown(1.5);
    doc.fontSize(10).font('Helvetica-Bold').text('PATIENT: ', 40, 100, { continued: true }).font('Helvetica').text(patient.full_name);
    doc.font('Helvetica-Bold').text('DOB: ', doc.page.width - 160, 100, { continued: true }).font('Helvetica').text(patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A');
    
    doc.font('Helvetica-Bold').text('Blood Type: ', 40, 115, { continued: true }).font('Helvetica').text(patient.blood_type || 'Unknown');
    doc.font('Helvetica-Bold').text('Age: ', doc.page.width - 160, 115, { continued: true }).font('Helvetica').text(`${age} years old`);

    // Divider
    doc.moveTo(40, 140).lineTo(doc.page.width - 40, 140).strokeColor('#e5e7eb').stroke();

    // Rx Symbol
    doc.fontSize(22).font('Helvetica-Bold').text('Rx', 40, 160);
    
    // Medications
    doc.moveDown(1);
    let yPos = doc.y;
    
    meds.forEach((med, idx) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${idx + 1}. ${med.medication_name} ${med.dosage}`, 40, yPos);
      yPos += 15;
      doc.fontSize(10).font('Helvetica').fillColor('#4b5563').text(`${med.frequency} — ${med.duration}`, 60, yPos);
      yPos += 15;
      if (med.instructions) {
        doc.fontSize(10).font('Helvetica-Oblique').text(med.instructions, 60, yPos);
        yPos += 15;
      }
      yPos += 10; // spacing between meds
    });

    // Notes
    if (group.notes) {
      yPos += 10;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1f2937').text('Notes: ', 40, yPos, { continued: true })
         .font('Helvetica').text(group.notes);
    }

    // Footer
    const footerY = doc.page.height - 80;
    doc.moveTo(40, footerY - 10).lineTo(doc.page.width - 40, footerY - 10).strokeColor('#e5e7eb').stroke();
    
    doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text('This prescription was issued digitally via DialyLink', 40, footerY);
    doc.text(`Ref: ${groupId.substring(0,8)}`, 40, footerY + 15);
    
    if (doctor.signature_url) {
      try {
        const sigResponse = await fetch(doctor.signature_url);
        if (sigResponse.ok) {
          const arrayBuffer = await sigResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          doc.image(buffer, doc.page.width - 150, footerY - 40, { width: 110 });
        }
      } catch (err) {
        console.error('Failed to load signature image', err);
      }
    } else {
      doc.font('Helvetica-Oblique').text(`${doctor.full_name}`, doc.page.width - 200, footerY, { align: 'right' });
    }
    
    doc.font('Helvetica-Bold').fillColor('#1f2937').text(`Dr. ${doctor.full_name}`, doc.page.width - 200, footerY + 15, { align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Server error generating PDF.' });
    }
  }
});

// PATCH /patients/:id/labs/:labId
router.patch('/patients/:id/labs/:labId', async (req, res) => {
  const { id: patientProfileId, labId } = req.params;
  const { doctor_notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update lab results
    const updateRes = await client.query(
      'UPDATE lab_results SET doctor_notes = $1 WHERE id = $2 AND patient_id = $3 RETURNING test_type',
      [doctor_notes, labId, patientProfileId]
    );

    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Lab result not found.' });
    }

    const testType = updateRes.rows[0].test_type;

    // Get doctor name and patient user_id for notification
    const docRes = await client.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    const doctorName = docRes.rows[0].full_name;

    const patRes = await client.query('SELECT user_id FROM patient_profiles WHERE id = $1', [patientProfileId]);
    const patientUserId = patRes.rows[0].user_id;

    // Insert notification
    await sendNotification({ user_id: patientUserId, type: 'lab_feedback', message: `Dr. ${doctorName} has reviewed your ${testType} results and left feedback.` });

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Lab feedback updated successfully.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating lab feedback:', error);
    return res.status(500).json({ success: false, message: 'Server error updating lab feedback.' });
  } finally {
    client.release();
  }
});

// GET /connection-requests
router.get('/connection-requests', async (req, res) => {
  try {
    const requestsRes = await pool.query(
      `SELECT cr.id as request_id, u.id as patient_user_id, u.full_name as patient_name, u.profile_photo_url, pp.date_of_birth, cr.message, cr.created_at
       FROM connection_requests cr
       JOIN users u ON cr.patient_id = u.id
       JOIN patient_profiles pp ON u.id = pp.user_id
       WHERE cr.doctor_id = $1 AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, data: requestsRes.rows });
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching requests.' });
  }
});

// POST /connection-requests/:requestId/accept
router.post('/connection-requests/:requestId/accept', async (req, res) => {
  try {
    // 1. Update request status
    const updateRes = await pool.query(
      `UPDATE connection_requests SET status = 'accepted', responded_at = NOW() WHERE id = $1 AND doctor_id = $2 RETURNING patient_id`,
      [req.params.requestId, req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found or unauthorized.' });
    }
    const patientUserId = updateRes.rows[0].patient_id;

    // 2. Get doctor profile id
    const docProfileRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
    if (docProfileRes.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Doctor profile not found.' });
    }

    // 3. Update patient's connected doctor
    await pool.query(
      `UPDATE patient_profiles SET connected_doctor_id = $1 WHERE user_id = $2`,
      [docProfileRes.rows[0].id, patientUserId]
    );

    // 4. Notify patient
    await sendNotification({ user_id: patientUserId, type: 'connection_accepted', message: `Dr. ${req.user.full_name} has accepted your connection request! You can now book appointments and access all features.` });

    return res.json({ success: true, message: 'Connection accepted successfully.' });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    return res.status(500).json({ success: false, message: 'Server error accepting request.' });
  }
});

// POST /connection-requests/:requestId/decline
router.post('/connection-requests/:requestId/decline', async (req, res) => {
  const { reason } = req.body;
  try {
    const updateRes = await pool.query(
      `UPDATE connection_requests SET status = 'declined', responded_at = NOW() WHERE id = $1 AND doctor_id = $2 RETURNING patient_id`,
      [req.params.requestId, req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found or unauthorized.' });
    }
    const patientUserId = updateRes.rows[0].patient_id;

    await sendNotification({ user_id: patientUserId, type: 'connection_declined', message: `Dr. ${req.user.full_name} was unable to accept your request at this time.` });

    return res.json({ success: true, message: 'Connection declined.' });
  } catch (error) {
    console.error('Error declining connection request:', error);
    return res.status(500).json({ success: false, message: 'Server error declining request.' });
  }
});

// --- AVAILABILITY & BLOCKED DATES ---

// GET /availability
router.get('/availability', async (req, res) => {
  try {
    const availRes = await pool.query(
      `SELECT day_of_week, start_time, end_time, is_available FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week ASC`,
      [req.user.id]
    );
    return res.json({ success: true, data: availRes.rows });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching availability.' });
  }
});

// PUT /availability
router.put('/availability', async (req, res) => {
  const { availability } = req.body;
  if (!Array.isArray(availability)) return res.status(400).json({ success: false, message: 'Invalid payload.' });

  try {
    await pool.query('BEGIN');
    
    // Clear existing
    await pool.query(`DELETE FROM doctor_availability WHERE doctor_id = $1`, [req.user.id]);
    
    // Insert new
    for (let day of availability) {
      await pool.query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available) VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, day.day_of_week, day.start_time, day.end_time, day.is_available]
      );
    }
    
    await pool.query('COMMIT');
    
    // Return updated
    const availRes = await pool.query(
      `SELECT day_of_week, start_time, end_time, is_available FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week ASC`,
      [req.user.id]
    );
    return res.json({ success: true, data: availRes.rows });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating availability:', error);
    return res.status(500).json({ success: false, message: 'Server error updating availability.' });
  }
});
// GET /availability-overrides
router.get('/availability-overrides', async (req, res) => {
  try {
    const overrideRes = await pool.query(
      `SELECT id, override_date, start_time, end_time, is_available FROM doctor_date_overrides WHERE doctor_id = $1 ORDER BY override_date ASC`,
      [req.user.id]
    );
    return res.json({ success: true, data: overrideRes.rows });
  } catch (error) {
    console.error('Error fetching availability overrides:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching availability overrides.' });
  }
});

// POST /availability-overrides
router.post('/availability-overrides', async (req, res) => {
  const { override_date, start_time, end_time, is_available } = req.body;
  if (!override_date || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  try {
    const insertRes = await pool.query(
      `INSERT INTO doctor_date_overrides (doctor_id, override_date, start_time, end_time, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING id, override_date, start_time, end_time, is_available`,
      [req.user.id, override_date, start_time, end_time, is_available]
    );
    return res.json({ success: true, data: insertRes.rows[0] });
  } catch (error) {
    console.error('Error adding availability override:', error);
    return res.status(500).json({ success: false, message: 'Server error adding availability override.' });
  }
});

// DELETE /availability-overrides/:id
router.delete('/availability-overrides/:id', async (req, res) => {
  try {
    const delRes = await pool.query(`DELETE FROM doctor_date_overrides WHERE id = $1 AND doctor_id = $2 RETURNING id`, [req.params.id, req.user.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Override not found.' });
    return res.json({ success: true, message: 'Override removed.' });
  } catch (error) {
    console.error('Error removing availability override:', error);
    return res.status(500).json({ success: false, message: 'Server error removing availability override.' });
  }
});

// GET /blocked-dates
router.get('/blocked-dates', async (req, res) => {
  try {
    const resDates = await pool.query(
      `SELECT id, blocked_date, reason FROM doctor_blocked_dates WHERE doctor_id = $1 ORDER BY blocked_date ASC`,
      [req.user.id]
    );
    return res.json({ success: true, data: resDates.rows });
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching blocked dates.' });
  }
});

// POST /blocked-dates
router.post('/blocked-dates', async (req, res) => {
  const { blocked_date, reason } = req.body;
  try {
    const insertRes = await pool.query(
      `INSERT INTO doctor_blocked_dates (doctor_id, blocked_date, reason) VALUES ($1, $2, $3) RETURNING id, blocked_date, reason`,
      [req.user.id, blocked_date, reason]
    );
    return res.json({ success: true, data: insertRes.rows[0] });
  } catch (error) {
    console.error('Error adding blocked date:', error);
    return res.status(500).json({ success: false, message: 'Server error adding blocked date.' });
  }
});

// DELETE /blocked-dates/:id
router.delete('/blocked-dates/:id', async (req, res) => {
  try {
    const delRes = await pool.query(
      `DELETE FROM doctor_blocked_dates WHERE id = $1 AND doctor_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (delRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Blocked date not found.' });
    }
    return res.json({ success: true, message: 'Blocked date removed.' });
  } catch (error) {
    console.error('Error removing blocked date:', error);
    return res.status(500).json({ success: false, message: 'Server error removing blocked date.' });
  }
});

// POST /ai-chat
router.post('/ai-chat', async (req, res) => {
  const { patient_id, messages } = req.body;
  if (!patient_id || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: 'Missing patient_id or messages array.' });
  }

  try {
    // 1. Verify patient is connected to this doctor
    const docProfileRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
    if (docProfileRes.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const doctorProfileId = docProfileRes.rows[0].id;

    const patientRes = await pool.query(
      `SELECT 
        pp.date_of_birth, pp.blood_type, pp.emergency_contact_name,
        u.full_name
       FROM patient_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.id = $1 AND pp.connected_doctor_id = $2`,
      [patient_id, doctorProfileId]
    );

    if (patientRes.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Patient not found or not connected.' });
    }

    const patient = patientRes.rows[0];

    // Calculate age
    let age = 'Unknown';
    if (patient.date_of_birth) {
      const dob = new Date(patient.date_of_birth);
      const diff = Date.now() - dob.getTime();
      age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }

    // 2. Fetch last 5 dialysis sessions
    const sessionsRes = await pool.query(
      `SELECT session_date, bp_before, bp_after, weight_before, weight_after, fluid_intake_ml, duration_minutes, symptoms
       FROM dialysis_sessions
       WHERE patient_id = $1
       ORDER BY session_date DESC, logged_at DESC LIMIT 5`,
      [patient_id]
    );

    let activeAlerts = [];
    let formattedSessions = sessionsRes.rows.map(s => {
      // Check for alerts
      if (s.bp_after) {
        const systolic = parseInt(s.bp_after.split('/')[0], 10);
        if (!isNaN(systolic) && (systolic > 180 || systolic < 90)) {
          activeAlerts.push(`Abnormal BP after session on ${new Date(s.session_date).toLocaleDateString()}: ${s.bp_after}`);
        }
      }
      return `${new Date(s.session_date).toLocaleDateString()} | BP: ${s.bp_before || 'N/A'} -> ${s.bp_after || 'N/A'} | Weight: ${s.weight_before || 'N/A'}kg -> ${s.weight_after || 'N/A'}kg | Symptoms: ${s.symptoms && s.symptoms.length > 0 ? s.symptoms.join(', ') : 'None'}`;
    }).join('\n');

    // 3. Fetch active prescriptions
    const medsRes = await pool.query(
      `SELECT medication_name, dosage, frequency, duration, instructions
       FROM prescriptions
       WHERE patient_id = $1 AND is_active = TRUE`,
      [patient_id]
    );

    let formattedMeds = medsRes.rows.map(m => {
      let line = `${m.medication_name} ${m.dosage} — ${m.frequency} for ${m.duration || 'ongoing'}`;
      if (m.instructions) line += `\nInstructions: ${m.instructions}`;
      return line;
    }).join('\n\n');

    // 4. Fetch last 3 lab results
    const labsRes = await pool.query(
      `SELECT test_type, result_date
       FROM lab_results
       WHERE patient_id = $1
       ORDER BY result_date DESC, uploaded_at DESC LIMIT 3`,
      [patient_id]
    );

    let formattedLabs = labsRes.rows.map(l => `${l.test_type} — ${new Date(l.result_date).toLocaleDateString()}`).join('\n');

    // Build System Instruction
    const systemInstruction = `You are a clinical support assistant for Dr. ${req.user.full_name || 'the doctor'}, 
reviewing one of their dialysis patients.

Your role:
- Analyze the patient's recent data and highlight clinically relevant 
  patterns, anomalies, or trends
- Provide concise, actionable insights that help the doctor make 
  treatment decisions
- Never override the doctor's judgment — you support it
- Flag concerning patterns early (e.g., "BP trending up 5mmHg/week over 
  3 weeks" or "Weight gain outpacing fluid removal")

Your tone:
- Professional but conversational
- Use "you" and "the patient" interchangeably
- Start with the most important finding first
- Use clinical language but explain the "so what" — why it matters

PATIENT SUMMARY:
Name: ${patient.full_name}, DOB: ${new Date(patient.date_of_birth).toLocaleDateString()} (Age: ${age})
Blood Type: ${patient.blood_type || 'Unknown'}

RECENT DIALYSIS SESSIONS (last 5):
${formattedSessions || 'No recent sessions.'}

ACTIVE MEDICATIONS:
${formattedMeds || 'No active medications.'}

RECENT LAB RESULTS:
${formattedLabs || 'No recent lab results.'}

ACTIVE ALERTS: ${activeAlerts.length > 0 ? activeAlerts.join('; ') : 'None'}

---

When the doctor asks a question, respond with:
1. Direct answer to their question (1-2 sentences)
2. Relevant supporting data from the chart (with dates)
3. Interpretation (what this means clinically)
4. Optional: One actionable suggestion ("Consider monitoring X closely 
   over the next 2 weeks" or "This might warrant adjusting Y")

Examples of good responses:

Q: "Summarize this patient's last month"
A: "Good news — your patient is stable overall. BP has been well-controlled 
(averaging 135–145 post-dialysis), and their IDWG is tracking around 2.5kg, 
which is at goal. One thing to monitor: their post-dialysis K+ on 5/20 was 
5.2 (slightly elevated). Last session, they reported leg cramps. If cramping 
recurs, might be worth checking electrolytes before the next session."

Q: "Why is their BP spiking?"
A: "On 5/22 and 5/24, you see post-dialysis BP jumps to 155–160 after 
running 140–145 the sessions before. Two possibilities: (1) increased 
ultrafiltration causing rapid BP drop during session → rebound hypertension, 
or (2) they gained more fluid this cycle (IDWG was 3.1kg on 5/24 vs 2.4kg 
on 5/20). Their pre-dialysis BP on 5/24 was 165, so the extra fluid gain 
is likely the culprit. Consider counseling on sodium/fluid intake."

Q: "What should I watch for this patient?"
A: "Three things: (1) That elevated K+ — recheck labs before next session 
if possible. (2) Symptoms of fluid overload — they reported mild edema last 
session. (3) The cramp pattern — if it's happening because of electrolyte 
shifts, you might need to adjust your dialysate or meds. Keep an eye on 
the trend over the next 2–3 sessions."

---

Settings to use:
- temperature: 0.3 (factual, data-driven)
- maxTokens: 512
- Keep responses under 250 words normally, up to 400 for complex summaries

The doctor trusts you to be accurate and grounded in their patient's data. 
Never speculate beyond what the data shows.`;

    // Call Gemini API with fallback
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: messages,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.3
      }
    };

    let lastData = null;
    let lastResponseOk = false;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        );
        lastData = await response.json();
        lastResponseOk = response.ok;
        
        if (response.ok) {
          break; // Success! Exit the fallback loop.
        } else {
          console.warn(`[AI Fallback] Model ${model} failed. Trying next...`);
        }
      } catch (err) {
        console.warn(`[AI Fallback] Fetch error for ${model}. Trying next...`);
      }
    }

    if (!lastResponseOk) {
      console.error('Gemini API Error:', lastData);
      let errorMessage = 'AI service unavailable. Try again.';
      if (lastData && lastData.error && lastData.error.message) {
        errorMessage = lastData.error.message;
      }
      return res.status(503).json({ success: false, message: errorMessage });
    }

    const reply = lastData.candidates[0].content.parts[0].text;
    return res.json({ success: true, reply });

  } catch (error) {
    console.error('Error in AI chat:', error);
    return res.status(500).json({ success: false, message: 'Server error processing AI request.' });
  }
});

// PUT /onboarding-complete
router.put('/onboarding-complete', async (req, res) => {
  try {
    const updateRes = await pool.query(
      'UPDATE doctor_profiles SET onboarding_complete = true WHERE user_id = $1 RETURNING id',
      [req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.json({ success: true, message: 'Onboarding completed.' });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ success: false, message: 'Server error completing onboarding.' });
  }
});

// GET /settings
router.get('/settings', async (req, res) => {
  try {
    const docRes = await pool.query(
      'SELECT is_listed, accepting_patients, onboarding_complete FROM doctor_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.json({ success: true, data: docRes.rows[0] });
  } catch (error) {
    console.error('Error fetching doctor settings:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching settings.' });
  }
});

// PATCH /settings
router.patch('/settings', async (req, res) => {
  const { is_listed, accepting_patients } = req.body;

  try {
    const updateRes = await pool.query(
      `UPDATE doctor_profiles 
       SET is_listed = COALESCE($1, is_listed), 
           accepting_patients = COALESCE($2, accepting_patients)
       WHERE user_id = $3 RETURNING id, is_listed, accepting_patients`,
      [is_listed, accepting_patients, req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.json({ success: true, message: 'Settings updated successfully.', data: updateRes.rows[0] });
  } catch (error) {
    console.error('Error updating doctor settings:', error);
    return res.status(500).json({ success: false, message: 'Server error updating settings.' });
  }
});

module.exports = router;
