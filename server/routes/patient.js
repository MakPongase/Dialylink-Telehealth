const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, checkRole } = require('../middleware/auth');
const { sendNotification } = require('../utils/notify');

// Protect all routes under /api/patient with verifyToken and checkRole(['patient'])
router.use(verifyToken, checkRole(['patient']));

// Helper to get patient profile ID from user ID
async function getPatientProfileId(userId) {
  const res = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [userId]);
  if (res.rowCount === 0) {
    throw new Error('Patient profile not found.');
  }
  return res.rows[0].id;
}

// POST /connect
router.post('/connect', async (req, res) => {
  const { connection_code } = req.body;

  if (!connection_code) {
    return res.status(400).json({ success: false, message: 'Connection code is required.' });
  }

  try {
    // Find doctor by connection code
    const docRes = await pool.query(
      `SELECT dp.id as doctor_profile_id, dp.specialization, u.full_name as doctor_name 
       FROM doctor_profiles dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.connection_code = $1`,
      [connection_code.trim().toUpperCase()]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Invalid connection code. Doctor not found.' });
    }

    const doctor = docRes.rows[0];

    // Update patient profile
    const updateRes = await pool.query(
      'UPDATE patient_profiles SET connected_doctor_id = $1 WHERE user_id = $2 RETURNING id',
      [doctor.doctor_profile_id, req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    return res.json({
      success: true,
      data: {
        doctor: {
          name: doctor.doctor_name,
          specialization: doctor.specialization
        }
      },
      message: `Successfully connected with Dr. ${doctor.doctor_name}.`
    });

  } catch (error) {
    console.error('Error connecting to doctor:', error);
    return res.status(500).json({ success: false, message: 'Server error during connection setup.' });
  }
});
// POST /disconnect
router.post('/disconnect', async (req, res) => {
  try {
    const updateRes = await pool.query(
      'UPDATE patient_profiles SET connected_doctor_id = NULL WHERE user_id = $1 RETURNING id',
      [req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    return res.json({
      success: true,
      message: 'Successfully disconnected from your doctor. Your health records remain intact.'
    });
  } catch (error) {
    console.error('Error disconnecting from doctor:', error);
    return res.status(500).json({ success: false, message: 'Server error during disconnection.' });
  }
});


// GET /dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    // Fetch patient profile details (for onboarding)
    const patRes = await pool.query(
      'SELECT pp.onboarding_complete, pp.date_of_birth, pp.blood_type, u.full_name FROM patient_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = $1',
      [patientProfileId]
    );
    const patData = patRes.rowCount > 0 ? patRes.rows[0] : {};
    const onboarding_complete = patData.onboarding_complete ?? true;
    const profile_details = { date_of_birth: patData.date_of_birth, blood_type: patData.blood_type, full_name: patData.full_name };

    // 1. Fetch connected doctor info
    const docRes = await pool.query(
      `SELECT dp.id, u.full_name as name, dp.specialization, u.profile_photo_url
       FROM patient_profiles pp
       JOIN doctor_profiles dp ON pp.connected_doctor_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE pp.id = $1`,
      [patientProfileId]
    );
    const doctorInfo = docRes.rowCount > 0 ? docRes.rows[0] : null;

    // 2. Fetch upcoming appointments (next 3)
    const apptsRes = await pool.query(
      `SELECT a.id, a.scheduled_at, a.type, a.status, a.notes, u.full_name as doctor_name
       FROM appointments a
       JOIN doctor_profiles dp ON a.doctor_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE a.patient_id = $1 AND a.scheduled_at >= NOW() AND a.status NOT IN ('completed', 'cancelled')
       ORDER BY a.scheduled_at ASC
       LIMIT 3`,
      [patientProfileId]
    );

    // 3. Fetch unread notifications count and recent notifications
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: unreadData } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    
    const unreadNotificationsCount = unreadData ? unreadData.length : 0;

    const { data: recentNotifsData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(4);
      
    const recentNotifsRes = { rows: recentNotifsData || [] };

    // 4. Fetch recent dialysis sessions (last 3)
    const sessionRes = await pool.query(
      `SELECT * FROM dialysis_sessions 
       WHERE patient_id = $1 
       ORDER BY session_date DESC, logged_at DESC 
       LIMIT 3`,
      [patientProfileId]
    );
    const recentSessions = sessionRes.rows;

    // 5. Fetch active prescriptions count and active medications
    const medsRes = await pool.query(
      `SELECT p.id, p.medication_name, p.dosage, p.frequency, p.duration 
       FROM prescriptions p
       JOIN prescription_groups pg ON p.group_id = pg.id
       WHERE pg.patient_id = $1 AND pg.is_active = true AND p.is_active = true
       ORDER BY pg.issued_at DESC, p.medication_name ASC`,
      [patientProfileId]
    );
    const activeMedications = medsRes.rows;
    const activePrescriptionsCount = activeMedications.length;

    return res.json({
      success: true,
      data: {
        onboarding_complete,
        profile_details,
        connected_doctor: doctorInfo,
        upcoming_appointments: apptsRes.rows,
        unread_notifications_count: unreadNotificationsCount,
        recent_notifications: recentNotifsRes.rows,
        recent_dialysis_sessions: recentSessions,
        active_prescriptions_count: activePrescriptionsCount,
        active_medications: activeMedications
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard details:', error);
    return res.status(500).json({ success: false, message: 'Server error loading dashboard.' });
  }
});

// POST /monitoring
router.post('/monitoring', async (req, res) => {
  const {
    session_date,
    bp_before,
    bp_after,
    weight_before,
    weight_after,
    fluid_intake_ml,
    duration_minutes,
    symptoms,
    notes,
    dialysis_type,
    blood_flow_rate,
    access_site,
    ultrafiltration_volume,
    num_exchanges,
    dwell_time_hours,
    fill_volume_ml,
    drain_volume_ml,
    dialysate_glucose_percent,
    effluent_appearance
  } = req.body;

  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    const dtype = dialysis_type === 'peritoneal' ? 'peritoneal' : 'hemodialysis';

    // Calculate IDWG
    let idwg_kg = null;
    const prevSessionRes = await pool.query(
      `SELECT weight_after FROM dialysis_sessions 
       WHERE patient_id = $1 
       ORDER BY session_date DESC, logged_at DESC 
       LIMIT 1`,
      [patientProfileId]
    );
    if (prevSessionRes.rowCount > 0 && prevSessionRes.rows[0].weight_after) {
      const prevWeightAfter = parseFloat(prevSessionRes.rows[0].weight_after);
      const currWeightBefore = parseFloat(weight_before);
      if (!isNaN(prevWeightAfter) && !isNaN(currWeightBefore)) {
        idwg_kg = (currWeightBefore - prevWeightAfter).toFixed(2);
      }
    }

    // Insert session record
    const insertRes = await pool.query(
      `INSERT INTO dialysis_sessions 
       (patient_id, session_date, bp_before, bp_after, weight_before, weight_after, fluid_intake_ml, duration_minutes, symptoms, notes,
        dialysis_type, blood_flow_rate, access_site, ultrafiltration_volume, num_exchanges, dwell_time_hours, fill_volume_ml, drain_volume_ml, dialysate_glucose_percent, effluent_appearance, idwg_kg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) 
       RETURNING *`,
      [
        patientProfileId,
        session_date || new Date().toISOString().split('T')[0],
        bp_before,
        bp_after,
        weight_before,
        weight_after,
        fluid_intake_ml,
        duration_minutes,
        symptoms || [],
        notes,
        dtype,
        dtype === 'hemodialysis' ? blood_flow_rate : null,
        dtype === 'hemodialysis' ? access_site : null,
        dtype === 'hemodialysis' ? ultrafiltration_volume : null,
        dtype === 'peritoneal' ? num_exchanges : null,
        dtype === 'peritoneal' ? dwell_time_hours : null,
        dtype === 'peritoneal' ? fill_volume_ml : null,
        dtype === 'peritoneal' ? drain_volume_ml : null,
        dtype === 'peritoneal' ? dialysate_glucose_percent : null,
        dtype === 'peritoneal' ? effluent_appearance : null,
        idwg_kg
      ]
    );
    const newSession = insertRes.rows[0];

    // AUTO-ALERTS
    const docUserRes = await pool.query(
      `SELECT dp.user_id 
       FROM patient_profiles pp
       JOIN doctor_profiles dp ON pp.connected_doctor_id = dp.id
       WHERE pp.id = $1`,
      [patientProfileId]
    );

    if (docUserRes.rowCount > 0) {
      const doctorUserId = docUserRes.rows[0].user_id;
      const patientName = req.user.full_name || 'Your patient';
      
      const safeSymptoms = symptoms || [];
      const criticalSymptoms = ['Chest Pain', 'Shortness of Breath', 'Fever / Chills', 'Bleeding at Access Site'];
      const hasCritical = safeSymptoms.some(s => criticalSymptoms.includes(s));

      const checkCooldownAndSend = async (type, msg) => {
        if (!hasCritical) {
          const cdRes = await pool.query(
            `SELECT created_at FROM notifications 
             WHERE user_id = $1 AND type = $2 AND message LIKE $3 
             AND created_at > NOW() - INTERVAL '4 hours' LIMIT 1`,
            [doctorUserId, type, `%${patientName}%`]
          );
          if (cdRes.rowCount > 0) return; // Cooldown active
        }
        await sendNotification({ user_id: doctorUserId, type, message: msg });
      };

      // 1. Weight Alert
      if (idwg_kg && parseFloat(idwg_kg) > 3.5) {
        await checkCooldownAndSend('weight_alert', `${patientName} gained ${idwg_kg}kg between sessions (IDWG: ${idwg_kg}kg). Threshold exceeded (>3.5kg).`);
      }

      // 2. BP Alert Matrix
      const parseBP = (bp) => {
        if (!bp) return [null, null];
        const parts = bp.split('/');
        return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
      };
      
      const [preSys, preDia] = parseBP(bp_before);
      const [postSys, postDia] = parseBP(bp_after);
      
      if (postSys && postSys > 180) {
        await checkCooldownAndSend('bp_alert', `${patientName} post-dialysis BP critically high: ${bp_after}. Hypertensive urgency.`);
      }
      if (postSys && postSys < 90) {
        await checkCooldownAndSend('bp_alert', `${patientName} post-dialysis BP critically low: ${bp_after}. Possible hypotension.`);
      }
      if (preSys && postSys && (preSys - postSys > 20)) {
        await checkCooldownAndSend('bp_alert', `${patientName} BP dropped ${preSys - postSys}mmHg during session (${bp_before} → ${bp_after}). Intradialytic hypotension.`);
      }
      if (postDia && postDia > 110) {
        await checkCooldownAndSend('bp_alert', `${patientName} post-dialysis diastolic critically high: ${bp_after}. Diastolic hypertension.`);
      }
      if (postDia && postDia < 60) {
        await checkCooldownAndSend('bp_alert', `${patientName} post-dialysis diastolic critically low: ${bp_after}.`);
      }
      if (preSys && preSys > 200) {
        await checkCooldownAndSend('bp_alert', `${patientName} pre-dialysis BP dangerously high: ${bp_before}. Session may need to be postponed.`);
      }

      // 3. PD Flags
      if (dtype === 'peritoneal') {
        const fillVol = parseFloat(fill_volume_ml);
        const drainVol = parseFloat(drain_volume_ml);
        if (!isNaN(fillVol) && !isNaN(drainVol) && drainVol < fillVol * 0.80) {
          const pct = Math.round((drainVol / fillVol) * 100);
          await checkCooldownAndSend('peritoneal_alert', `${patientName} reported incomplete drain: ${drainVol}mL drained vs ${fillVol}mL filled (${pct}% return). Possible catheter or drainage issue.`);
        }
        
        if (effluent_appearance === 'cloudy' || effluent_appearance === 'bloody') {
          await checkCooldownAndSend('peritoneal_alert', `${patientName} reported ${effluent_appearance} peritoneal effluent. This may indicate peritonitis. Immediate review recommended.`);
        }
      }

      // 4. Critical Symptoms
      if (hasCritical) {
        const presentCritical = criticalSymptoms.filter(s => safeSymptoms.includes(s)).join(', ');
        await sendNotification({
          user_id: doctorUserId,
          type: 'symptom_alert',
          message: `URGENT: ${patientName} reported ${presentCritical} after their dialysis session. Immediate review recommended.`
        });
      }

      // General Session Logged
      await sendNotification({
        user_id: doctorUserId,
        type: 'session_logged',
        message: `${patientName} logged a new ${dtype} session.`
      });
    }

    return res.status(201).json({
      success: true,
      data: newSession,
      message: 'Dialysis monitoring log saved successfully.'
    });

  } catch (error) {
    console.error('Error logging session monitoring details:', error);
    return res.status(500).json({ success: false, message: 'Server error saving monitoring log.' });
  }
});

// GET /monitoring
router.get('/monitoring', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    const logsRes = await pool.query(
      `SELECT * FROM dialysis_sessions 
       WHERE patient_id = $1 
       ORDER BY session_date DESC, logged_at DESC`,
      [patientProfileId]
    );

    return res.json({
      success: true,
      data: logsRes.rows
    });

  } catch (error) {
    console.error('Error fetching monitoring logs:', error);
    return res.status(500).json({ success: false, message: 'Server error loading monitoring logs.' });
  }
});

// GET /labs
router.get('/labs', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    const labsRes = await pool.query(
      `SELECT * FROM lab_results 
       WHERE patient_id = $1 
       ORDER BY result_date DESC, uploaded_at DESC`,
      [patientProfileId]
    );

    return res.json({
      success: true,
      data: labsRes.rows
    });

  } catch (error) {
    console.error('Error fetching lab results:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching lab results.' });
  }
});

// POST /labs
router.post('/labs', async (req, res) => {
  const { file_url, file_name, test_type, result_date } = req.body;

  if (!file_url || !file_name || !test_type || !result_date) {
    return res.status(400).json({ success: false, message: 'All lab metadata fields are required.' });
  }

  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    const insertRes = await pool.query(
      `INSERT INTO lab_results (patient_id, file_url, file_name, test_type, result_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patientProfileId, file_url, file_name, test_type, result_date]
    );

    // Notify connected doctor
    const docUserRes = await pool.query(
      `SELECT dp.user_id 
       FROM patient_profiles pp
       JOIN doctor_profiles dp ON pp.connected_doctor_id = dp.id
       WHERE pp.id = $1`,
      [patientProfileId]
    );

    if (docUserRes.rowCount > 0) {
      const doctorUserId = docUserRes.rows[0].user_id;
      const userName = req.user.full_name || 'Your patient';
      await sendNotification({ 
        user_id: doctorUserId, 
        type: 'lab_result_uploaded', 
        message: `${userName} uploaded a new lab result: ${test_type}` 
      });
    }

    return res.status(201).json({
      success: true,
      data: insertRes.rows[0],
      message: 'Lab result metadata recorded successfully.'
    });

  } catch (error) {
    console.error('Error saving lab result:', error);
    return res.status(500).json({ success: false, message: 'Server error saving lab result metadata.' });
  }
});

// GET /prescriptions/:groupId/pdf
router.get('/prescriptions/:groupId/pdf', async (req, res) => {
  const { groupId } = req.params;
  const PDFDocument = require('pdfkit');
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    
    // 1. Fetch prescription group
    const groupRes = await pool.query(
      `SELECT pg.*, dp.id as doctor_profile_id, dp.license_number, dp.specialization, dp.hospital_affiliation, 
              u_doc.full_name as doctor_name
       FROM prescription_groups pg
       JOIN doctor_profiles dp ON pg.doctor_id = dp.id
       JOIN users u_doc ON dp.user_id = u_doc.id
       WHERE pg.id = $1 AND pg.patient_id = $2`,
      [groupId, patientProfileId]
    );

    if (groupRes.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Prescription not found or access denied.' });
    }
    const group = groupRes.rows[0];

    // 2. Fetch all prescriptions
    const medsRes = await pool.query(
      `SELECT * FROM prescriptions WHERE group_id = $1`,
      [groupId]
    );
    const meds = medsRes.rows;

    // 4. Fetch patient info
    const patRes = await pool.query(
      `SELECT pp.date_of_birth, pp.blood_type, u.full_name
       FROM patient_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.id = $1`,
      [patientProfileId]
    );
    const patient = patRes.rows[0];

    // 5. Generate PDF
    const doc = new PDFDocument({ size: 'A5', margin: 15 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${groupId.substring(0,8)}.pdf"`);
    doc.pipe(res);

    // Light gray border rectangle inset 15pt from edges
    doc.rect(15, 15, 419 - 30, 595 - 30).stroke('#e5e7eb');

    // TOP SECTION
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0d9488').text('DialyLink', 30, 30);
    
    // Right: Date issued
    const issuedDate = new Date(group.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(issuedDate, 30, 34, { align: 'right', width: 419 - 60 });

    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000').text(`Dr. ${group.doctor_name}`, 30, doc.y);
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280')
       .text(`${group.specialization || 'Nephrologist'} | PRC Lic. No. ${group.license_number}`, 30, doc.y + 4)
       .text(group.hospital_affiliation || '', 30, doc.y + 2);
    
    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(419 - 30, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.5);

    // PATIENT SECTION
    const formattedDob = patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(`PATIENT: ${patient.full_name}`, 30, doc.y);
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(`DOB: ${formattedDob}  Blood Type: ${patient.blood_type || 'Unknown'}`, 30, doc.y + 2);
    
    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(419 - 30, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.5);

    // Rx SECTION
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#000000').text('Rx', 30, doc.y);
    doc.moveDown(0.5);

    meds.forEach((med, idx) => {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text(`${idx + 1}. ${med.medication_name} ${med.dosage}`, 30, doc.y);
      doc.font('Helvetica').fontSize(10).fillColor('#4b5563').text(`${med.frequency} — ${med.duration}`, 45, doc.y + 2);
      if (med.instructions) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#6b7280').text(med.instructions, 45, doc.y + 2);
      }
      doc.moveDown(0.5);
    });

    if (group.notes) {
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('Notes: ', 30, doc.y, { continued: true });
      doc.font('Helvetica-Oblique').text(group.notes);
    }

    doc.moveDown(1);
    doc.moveTo(30, doc.y).lineTo(419 - 30, doc.y).strokeColor('#e5e7eb').stroke();
    
    // FOOTER (absolute position near bottom)
    doc.font('Helvetica').fontSize(8).fillColor('#9ca3af')
       .text('This prescription was issued digitally via DialyLink.', 30, 595 - 40, { align: 'center', width: 419 - 60 });
    doc.text(`Ref: ${groupId.substring(0,8)}`, 30, 595 - 40, { align: 'right', width: 419 - 60 });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error generating PDF.' });
    }
  }
});
// GET /prescriptions
router.get('/prescriptions', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    
    // Fetch all groups
    const groupsRes = await pool.query(
      `SELECT pg.*, u.full_name as doctor_name 
       FROM prescription_groups pg
       JOIN doctor_profiles dp ON pg.doctor_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE pg.patient_id = $1
       ORDER BY pg.issued_at DESC`,
      [patientProfileId]
    );

    if (groupsRes.rowCount === 0) {
      return res.json({ success: true, data: [] });
    }

    const groupIds = groupsRes.rows.map(g => g.id);
    
    // Fetch all medications for these groups
    const medsRes = await pool.query(
      `SELECT * FROM prescriptions WHERE group_id = ANY($1::uuid[])`,
      [groupIds]
    );

    // Group them
    const groups = groupsRes.rows.map(g => ({
      ...g,
      medications: medsRes.rows.filter(m => m.group_id === g.id)
    }));

    return res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching prescriptions.' });
  }
});

// GET /documents
router.get('/documents', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    const docRes = await pool.query(
      `SELECT * FROM patient_documents WHERE patient_id = $1 ORDER BY uploaded_at DESC`,
      [patientProfileId]
    );
    return res.json({ success: true, data: docRes.rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching documents.' });
  }
});

// POST /documents
router.post('/documents', async (req, res) => {
  const { file_url, file_name } = req.body;
  if (!file_url || !file_name) {
    return res.status(400).json({ success: false, message: 'File URL and name are required.' });
  }
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    const insertRes = await pool.query(
      `INSERT INTO patient_documents (patient_id, file_url, file_name) VALUES ($1, $2, $3) RETURNING *`,
      [patientProfileId, file_url, file_name]
    );
    return res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (error) {
    console.error('Error saving document:', error);
    return res.status(500).json({ success: false, message: 'Server error saving document.' });
  }
});

// DELETE /documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    const delRes = await pool.query(
      `DELETE FROM patient_documents WHERE id = $1 AND patient_id = $2 RETURNING *`,
      [req.params.id, patientProfileId]
    );
    if (delRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }
    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting document.' });
  }
});

// GET /consultations
router.get('/consultations', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    const consRes = await pool.query(
      `SELECT a.*, u.full_name as doctor_name 
       FROM appointments a
       JOIN doctor_profiles dp ON a.doctor_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE a.patient_id = $1 AND a.status = 'completed' AND a.type = 'Consultation'
       ORDER BY a.scheduled_at DESC`,
      [patientProfileId]
    );
    return res.json({ success: true, data: consRes.rows });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching consultations.' });
  }
});

const PDFDocument = require('pdfkit');

// GET /prescriptions/:groupId/pdf
router.get('/prescriptions/:groupId/pdf', async (req, res) => {
  const { groupId } = req.params;

  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    // 1. Fetch Patient Profile
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

    // 2. Fetch Prescription Group
    const groupRes = await pool.query(`SELECT * FROM prescription_groups WHERE id = $1 AND patient_id = $2`, [groupId, patientProfileId]);
    if (groupRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Prescription group not found.' });
    const group = groupRes.rows[0];

    // 3. Fetch Doctor Profile
    const docRes = await pool.query(
      `SELECT u.full_name, dp.license_number, dp.specialization, dp.signature_url 
       FROM doctor_profiles dp JOIN users u ON dp.user_id = u.id 
       WHERE dp.id = $1`, [group.doctor_id]
    );
    if (docRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    const doctor = docRes.rows[0];

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


// GET /appointments
router.get('/appointments', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    const apptsRes = await pool.query(
      `SELECT a.*, u.full_name as doctor_name, dp.specialization
       FROM appointments a
       JOIN doctor_profiles dp ON a.doctor_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE a.patient_id = $1
       ORDER BY a.scheduled_at ASC`,
      [patientProfileId]
    );
    return res.json({ success: true, data: apptsRes.rows });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching appointments.' });
  }
});

// POST /appointments
router.post('/appointments', async (req, res) => {
  const { scheduled_at, type, notes } = req.body;
  if (!scheduled_at || !type) {
    return res.status(400).json({ success: false, message: 'Scheduled date and type are required.' });
  }

  // Map frontend types to Postgres enum
  let dbType = type.toLowerCase();
  if (type === 'Routine Check') dbType = 'consultation';
  if (type === 'Consultation') dbType = 'consultation';

  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    const patRes = await pool.query(
      'SELECT connected_doctor_id FROM patient_profiles WHERE id = $1',
      [patientProfileId]
    );
    const doctorId = patRes.rows[0].connected_doctor_id;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'You must be connected to a doctor to book an appointment.' });
    }

    const insertRes = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, type, status, notes)
       VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
      [patientProfileId, doctorId, scheduled_at, dbType, notes]
    );

    // Notify doctor
    const docRes = await pool.query('SELECT user_id FROM doctor_profiles WHERE id = $1', [doctorId]);
    if (docRes.rowCount > 0) {
      await sendNotification({ user_id: docRes.rows[0].user_id, type: 'appointment', message: `Patient ${req.user.full_name} requested a new ${type} appointment.` });
    }

    return res.status(201).json({ success: true, data: insertRes.rows[0], message: 'Appointment booked successfully.' });
  } catch (error) {
    console.error('Error booking appointment:', error);
    return res.status(500).json({ success: false, message: 'Server error booking appointment.' });
  }
});

// PATCH /appointments/:id/reschedule
router.patch('/appointments/:id/reschedule', async (req, res) => {
  const { id } = req.params;
  const { scheduled_at } = req.body;
  if (!scheduled_at) {
    return res.status(400).json({ success: false, message: 'Scheduled date is required.' });
  }

  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    // Verify appointment belongs to patient
    const apptRes = await pool.query(
      `SELECT * FROM appointments WHERE id = $1 AND patient_id = $2`,
      [id, patientProfileId]
    );

    if (apptRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const doctorId = apptRes.rows[0].doctor_id;

    // Update appointment
    const updateRes = await pool.query(
      `UPDATE appointments SET scheduled_at = $1, status = 'pending' WHERE id = $2 RETURNING *`,
      [scheduled_at, id]
    );

    // Notify doctor
    const docRes = await pool.query('SELECT user_id FROM doctor_profiles WHERE id = $1', [doctorId]);
    if (docRes.rowCount > 0) {
      const typeStr = apptRes.rows[0].type || 'appointment';
      await sendNotification({ user_id: docRes.rows[0].user_id, type: 'appointment', message: `Patient ${req.user.full_name} rescheduled their ${typeStr}.` });
    }

    return res.json({ success: true, data: updateRes.rows[0], message: 'Appointment rescheduled successfully.' });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return res.status(500).json({ success: false, message: 'Server error rescheduling appointment.' });
  }
});

// POST /connection-request
router.post('/connection-request', async (req, res) => {
  const { doctor_id, message } = req.body;
  if (!doctor_id) {
    return res.status(400).json({ success: false, message: 'Doctor ID is required.' });
  }

  try {
    // Check if doctor is accepting patients
    const acceptRes = await pool.query(
      'SELECT accepting_patients FROM doctor_profiles WHERE id = $1 OR user_id = $1',
      [doctor_id]
    );

    if (acceptRes.rowCount > 0 && acceptRes.rows[0].accepting_patients === false) {
      return res.status(400).json({ 
        success: false, 
        message: 'This doctor is not currently accepting new patients through connection requests.' 
      });
    }

    const patRes = await pool.query('SELECT connected_doctor_id, user_id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
    if (patRes.rowCount > 0 && patRes.rows[0].connected_doctor_id) {
      return res.status(400).json({ success: false, message: 'You are already connected to a doctor.' });
    }

    const checkRes = await pool.query(
      `SELECT status FROM connection_requests WHERE patient_id = $1 AND doctor_id = $2 AND status IN ('pending', 'accepted')`,
      [req.user.id, doctor_id]
    );

    if (checkRes.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'You already have a pending or accepted request for this doctor.' });
    }

    await pool.query(
      `INSERT INTO connection_requests (patient_id, doctor_id, message) VALUES ($1, $2, $3)`,
      [req.user.id, doctor_id, message || null]
    );

    await sendNotification({ user_id: doctor_id, type: 'connection_request', message: `You have a new connection request from ${req.user.full_name}.` });

    return res.json({ success: true, message: 'Request sent. Awaiting doctor approval.' });
  } catch (error) {
    console.error('Error creating connection request:', error);
    if (error.constraint === 'connection_requests_patient_id_doctor_id_key') {
      return res.status(400).json({ success: false, message: 'You already have a request for this doctor.' });
    }
    return res.status(500).json({ success: false, message: 'Server error processing request.' });
  }
});

// GET /connection-request/status
router.get('/connection-request/status', async (req, res) => {
  try {
    const reqRes = await pool.query(
      `SELECT cr.doctor_id, u.full_name as doctor_name, cr.status, cr.created_at
       FROM connection_requests cr
       JOIN users u ON cr.doctor_id = u.id
       WHERE cr.patient_id = $1 AND cr.status = 'pending'
       ORDER BY cr.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (reqRes.rowCount === 0) {
      return res.json({ success: true, data: null });
    }

    return res.json({ success: true, data: reqRes.rows[0] });
  } catch (error) {
    console.error('Error fetching connection request status:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching status.' });
  }
});


// ===========================
// AI ROUTES
// ===========================

// Helper: call Gemini API (one-shot)
async function callGemini({ systemInstruction, contents, maxTokens = 512, temperature = 0.3, responseSchema = null }) {
  const key = process.env.GEMINI_API_KEY;
  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      ...(responseSchema ? { responseMimeType: 'application/json' } : {})
    }
  };
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await response.json();
  if (!response.ok) throw data;
  return data.candidates[0].content.parts[0].text;
}

// POST /api/patient/ai/symptom-triage
router.post('/ai/symptom-triage', async (req, res) => {
  const { symptoms_description } = req.body;
  if (!symptoms_description || symptoms_description.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Please describe your symptoms.' });
  }

  const systemInstruction = `You are a medical triage guide helping a patient find the right type of 
specialist based on their symptoms.

Your output MUST be valid JSON (no markdown, no code blocks, just pure JSON):
{
  "explanation": "Plain-language explanation of what their symptoms likely relate to. Be warm and reassuring ('These symptoms are actually pretty common in dialysis patients') but honest. 2-3 sentences.",
  "recommended_specializations": ["Specialty 1", "Specialty 2"],
  "reason": "Why these specializations. Keep it clear and practical. 1 sentence."
}

ALLOWED SPECIALIZATIONS ONLY:
Nephrology, Internal Medicine, Cardiology, General Practice, Pulmonology, Endocrinology

---

How to explain each common dialysis symptom:

Swelling (edema):
- explanation: "Swelling in your legs or hands is often fluid buildup between dialysis sessions. Your kidneys aren't filtering like they should, so fluid accumulates. It's treatable and dialysis helps, but a nephrologist can adjust your sessions or medications to help."
- specializations: ["Nephrology"]

Shortness of breath:
- explanation: "This can be from fluid in your lungs (pulmonary edema) or it could be your heart working harder because of kidney disease. Either way, this needs quick attention from someone who specializes in kidneys or heart."
- specializations: ["Nephrology", "Cardiology"]

Severe fatigue:
- explanation: "Dialysis patients often feel tired because your body is working hard to manage kidney disease. But fatigue can also signal anemia, low blood sugar (if diabetic), or electrolyte imbalances. A nephrologist or internist can run labs and adjust your treatment."
- specializations: ["Nephrology", "Internal Medicine"]

Chest pain:
- explanation: "Chest pain is always a concern and needs urgent evaluation. Given kidney disease, your heart can be affected. Go to the ER if this is happening now."
- specializations: ["Cardiology"]

Muscle weakness:
- explanation: "Weakness can be from low potassium, low calcium, or just the stress dialysis puts on your body. A nephrologist will want to check your labs and might adjust your dialysate or medications."
- specializations: ["Nephrology", "Internal Medicine"]

Bone or joint pain:
- explanation: "Kidney disease can affect how your body handles calcium and phosphorus, which shows up as bone pain. This is actually pretty common in dialysis patients and very manageable. A nephrologist can help."
- specializations: ["Nephrology"]

Diabetes-related symptoms (high blood sugar, frequent urination before dialysis):
- explanation: "If you have diabetes alongside kidney disease, you need coordinated care. An endocrinologist manages your diabetes, and a nephrologist manages your kidneys — they often work together."
- specializations: ["Endocrinology", "Nephrology"]


---

General rules for your response:
- NEVER diagnose ("You have X condition")
- Always acknowledge their symptoms are real and worth checking
- Provide ONE or TWO specializations max (more is confusing)
- If unclear: default to Nephrology + Internal Medicine (covers most bases)
- Be warm: "This sounds uncomfortable, and I'm glad you're getting checked out"

---

Settings to use:
- temperature: 0.2 (consistency and accuracy matter more than personality here)
- maxTokens: 300
- STRICT format: output ONLY valid JSON, nothing else`;

  try {
    const raw = await callGemini({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: symptoms_description.trim() }] }],
      maxTokens: 300,
      temperature: 0.2
    });

    // Strip markdown fences, then try to extract a JSON object from the response
    let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    // If there's extra prose, grab just the first {...} block
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    const parsed = JSON.parse(cleaned);

    return res.json({
      success: true,
      explanation: parsed.explanation,
      recommended_specializations: parsed.recommended_specializations,
      reason: parsed.reason
    });
  } catch (error) {
    console.error('Symptom triage error:', error);
    return res.status(500).json({ success: false, message: 'Could not analyze symptoms. Please try again.' });
  }
});

// POST /api/patient/ai/health-chat
router.post('/ai/health-chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'Messages array is required.' });
  }

  try {
    const patientId = await getPatientProfileId(req.user.id);

    // Fetch patient data from Neon
    const [sessionsRes, medsRes, labsRes, doctorRes] = await Promise.all([
      pool.query(
        `SELECT session_date, bp_before, bp_after, weight_before, weight_after, symptoms
         FROM dialysis_sessions WHERE patient_id = $1
         ORDER BY session_date DESC, logged_at DESC LIMIT 5`,
        [patientId]
      ),
      pool.query(
        `SELECT medication_name, dosage, frequency, instructions
         FROM prescriptions WHERE patient_id = $1 AND is_active = TRUE`,
        [patientId]
      ),
      pool.query(
        `SELECT test_type, result_date FROM lab_results
         WHERE patient_id = $1 ORDER BY result_date DESC LIMIT 3`,
        [patientId]
      ),
      pool.query(
        `SELECT u.full_name as doctor_name FROM patient_profiles pp
         JOIN doctor_profiles dp ON pp.connected_doctor_id = dp.id
         JOIN users u ON dp.user_id = u.id
         WHERE pp.id = $1`,
        [patientId]
      )
    ]);

    const doctorName = doctorRes.rows[0]?.doctor_name || 'your doctor';

    const formattedSessions = sessionsRes.rows.length > 0
      ? sessionsRes.rows.map(s =>
          `${new Date(s.session_date).toLocaleDateString()} | BP: ${s.bp_before || 'N/A'} → ${s.bp_after || 'N/A'} | Weight: ${s.weight_before || 'N/A'}kg → ${s.weight_after || 'N/A'}kg | Symptoms: ${s.symptoms?.join(', ') || 'None'}`
        ).join('\n')
      : 'No recent sessions recorded.';

    const formattedMeds = medsRes.rows.length > 0
      ? medsRes.rows.map(m => `${m.medication_name} ${m.dosage} — ${m.frequency}${m.instructions ? ' (' + m.instructions + ')' : ''}`).join('\n')
      : 'No active medications.';

    const formattedLabs = labsRes.rows.length > 0
      ? labsRes.rows.map(l => `${l.test_type} — ${new Date(l.result_date).toLocaleDateString()}`).join('\n')
      : 'No recent lab results.';

    const systemInstruction = `You are the patient's personal Health Companion — a knowledgeable, 
caring AI friend who knows their dialysis journey inside and out.

Your personality:
- Warm, conversational, and genuinely interested in their wellbeing
- Speak like a trusted friend, not a textbook
- Use "you" language and acknowledge their feelings ("That sounds tough," 
  "Good catch," "I'm glad you're tracking that")
- Explain medical concepts in plain language, not jargon
- End responses with an actionable next step or encouragement

Your boundaries (never break these, but weave them in naturally):
- You cannot diagnose: if they describe symptoms, explain what they might 
  relate to based on their condition, but always say "This is something 
  worth mentioning to Dr. ${doctorName} at your next visit."
- You cannot prescribe: never suggest starting or stopping medications, 
  but you can explain what their current meds do
- You're not an emergency service: if they mention chest pain, shortness 
  of breath, or severe symptoms, tell them directly: "Please call 911 or 
  go to the ER immediately. Don't wait for a doctor's appointment."

Your data about them (use this to personalize):
Their doctor is: Dr. ${doctorName}

RECENT DIALYSIS SESSIONS (last 5):
${formattedSessions}

ACTIVE MEDICATIONS:
${formattedMeds}

RECENT LAB RESULTS:
${formattedLabs}

---

How to answer different types of questions:

ABOUT THEIR DATA ("Is my BP getting better?"):
- Look at the session data, identify trends, explain in plain English
- Example: "Looking at your last 5 sessions, your post-dialysis BP has 
  been hovering around 140s. That's actually pretty stable, which is good. 
  A month ago it was spiking to 165+, so you're trending in the right 
  direction. Keep doing what you're doing."

ABOUT THEIR MEDICATIONS ("What does Ferrous Sulfate do?"):
- Explain the purpose simply, relate it to dialysis
- Example: "Ferrous Sulfate is iron. Dialysis removes things from your 
  blood that your kidneys would normally keep, and iron is one of those 
  things. Your labs probably showed low iron, so this brings it back up. 
  It helps with energy and fatigue."

ABOUT SYMPTOMS ("I've been feeling dizzy after sessions"):
- Acknowledge it's real, explain possibilities related to their data, 
  direct them to their doctor
- Example: "Dizziness after dialysis is actually pretty common — it can 
  be from your BP dropping too fast, dehydration, or even just the session 
  being intense. Looking at your numbers, your post-dialysis BP has been 
  on the lower side the last couple sessions (105–110). That could be it. 
  Definitely tell Dr. ${doctorName} about this at your next visit. They might 
  adjust your session or your medications."


ASKING FOR ADVICE ("Should I be limiting salt?"):
- Give practical guidance WITHOUT claiming medical authority
- Example: "That's a great question. Most dialysis patients do limit salt 
  because it makes you thirsty and gain more fluid between sessions. But 
  the exact amount depends on your specific situation — how your body 
  handles fluid, your current IDWG numbers, your doctor's recommendations. 
  Ask Dr. ${doctorName} specifically what salt limit works for you. If you want 
  a starting point, many dialysis educators suggest keeping sodium under 
  2000mg per day, but again, yours might be different."

---

Final instruction:
Keep answers conversational and under 200 words normally. 
If they ask for a summary or deeper explanation, go up to 300 words.
Always feel like you're talking to a friend, not reading a disclaimer.`;

    const reply = await callGemini({
      systemInstruction,
      contents: messages,
      maxTokens: 400,
      temperature: 0.4
    });

    return res.json({ success: true, reply });
  } catch (error) {
    console.error('Health chat error:', error);
    return res.status(500).json({ success: false, message: 'AI service unavailable. Please try again.' });
  }
});

// PUT /onboarding-complete
router.put('/onboarding-complete', async (req, res) => {
  try {
    const updateRes = await pool.query(
      'UPDATE patient_profiles SET onboarding_complete = true WHERE user_id = $1 RETURNING id',
      [req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    return res.json({ success: true, message: 'Onboarding completed.' });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ success: false, message: 'Server error completing onboarding.' });
  }
});

// GET /profile
router.get('/profile', async (req, res) => {
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);
    const profileRes = await pool.query(
      `SELECT pp.date_of_birth, pp.blood_type, pp.address, pp.emergency_contact_name, pp.emergency_contact_phone, pp.connected_doctor_id,
              u.full_name, u.email, u.phone, u.profile_photo_url
       FROM patient_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.id = $1`,
      [patientProfileId]
    );
    if (profileRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }
    return res.json({ success: true, data: profileRes.rows[0] });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
});

// PATCH /profile
// PATCH /profile
router.patch('/profile', async (req, res) => {
  const { date_of_birth, blood_type, address, emergency_contact_name, emergency_contact_phone, phone, email, full_name } = req.body;
  try {
    const patientProfileId = await getPatientProfileId(req.user.id);

    await pool.query(
      `UPDATE patient_profiles 
       SET date_of_birth = $1,
           blood_type = $2,
           address = $3,
           emergency_contact_name = $4,
           emergency_contact_phone = $5
       WHERE id = $6`,
      [date_of_birth || null, blood_type || null, address || null, emergency_contact_name || null, emergency_contact_phone || null, patientProfileId]
    );

    if (phone) {
      await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, req.user.id]);
    }
    if (full_name) {
      await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [full_name, req.user.id]);
    }
    if (email) {
      await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.id]);
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.auth.admin.updateUserById(req.user.id, { email });
    }

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

module.exports = router;


