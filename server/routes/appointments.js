const { sendNotification } = require("../utils/notify");
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// Protect all routes under /api/appointments with verifyToken
router.use(verifyToken);

// GET / (list appointments based on role)
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'doctor') {
      // Find doctor profile
      const docRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
      if (docRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }
      const doctorProfileId = docRes.rows[0].id;

      // Get doctor's appointments
      const apptsRes = await pool.query(
        `SELECT a.*, u.full_name as patient_name, u.profile_photo_url as patient_photo
         FROM appointments a
         JOIN patient_profiles pp ON a.patient_id = pp.id
         JOIN users u ON pp.user_id = u.id
         WHERE a.doctor_id = $1
         ORDER BY a.scheduled_at DESC`,
        [doctorProfileId]
      );
      return res.json({ success: true, data: apptsRes.rows });

    } else if (req.user.role === 'patient') {
      // Find patient profile
      const patRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
      if (patRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      const patientProfileId = patRes.rows[0].id;

      // Get patient's appointments
      const apptsRes = await pool.query(
        `SELECT a.*, u.full_name as doctor_name, u.profile_photo_url as doctor_photo, dp.specialization
         FROM appointments a
         JOIN doctor_profiles dp ON a.doctor_id = dp.id
         JOIN users u ON dp.user_id = u.id
         WHERE a.patient_id = $1
         ORDER BY a.scheduled_at DESC`,
        [patientProfileId]
      );
      return res.json({ success: true, data: apptsRes.rows });
    } else {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching appointments.' });
  }
});

router.post('/', async (req, res) => {
  let { doctor_id, patient_id, scheduled_at, type, notes } = req.body;

  try {
    if (req.user.role === 'doctor') {
      const docRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
      if (docRes.rowCount > 0) {
        doctor_id = docRes.rows[0].id;
      }
    } else if (req.user.role === 'patient') {
      const patRes = await pool.query('SELECT id, connected_doctor_id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
      if (patRes.rowCount > 0) {
        patient_id = patRes.rows[0].id;
        doctor_id = patRes.rows[0].connected_doctor_id;
      }
    }

    if (!doctor_id || !patient_id || !scheduled_at || !type) {
      return res.status(400).json({ success: false, message: 'Doctor ID, Patient ID, Scheduled At, and Type are required.' });
    }

    const insertRes = await pool.query(
      `INSERT INTO appointments (doctor_id, patient_id, scheduled_at, type, status, notes)
       VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
      [doctor_id, patient_id, scheduled_at, type, notes]
    );

    return res.status(201).json({
      success: true,
      data: insertRes.rows[0],
      message: 'Appointment request created.'
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    return res.status(500).json({ success: false, message: 'Server error booking appointment.' });
  }
});

// PUT /:id (update appointment status)
router.put('/:id', async (req, res) => {
  const appointmentId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch existing appointment details
    const apptRes = await client.query(
      `SELECT a.*, 
              dp.user_id as doctor_user_id, 
              pp.user_id as patient_user_id,
              ud.full_name as doctor_name,
              up.full_name as patient_name
       FROM appointments a
       JOIN doctor_profiles dp ON a.doctor_id = dp.id
       JOIN patient_profiles pp ON a.patient_id = pp.id
       JOIN users ud ON dp.user_id = ud.id
       JOIN users up ON pp.user_id = up.id
       WHERE a.id = $1`,
      [appointmentId]
    );

    if (apptRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const appt = apptRes.rows[0];

    // Update status
    const updateRes = await client.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, appointmentId]
    );

    // Identify who to notify: notify the other party
    let recipientUserId;
    let messageText;

    if (req.user.id === appt.doctor_user_id) {
      // Doctor is updating status, notify patient
      recipientUserId = appt.patient_user_id;
      messageText = `Your appointment with Dr. ${appt.doctor_name} has been updated to '${status}'.`;
    } else {
      // Patient is updating status, notify doctor
      recipientUserId = appt.doctor_user_id;
      messageText = `Your appointment with patient ${appt.patient_name} has been updated to '${status}'.`;
    }

    // Insert notification
    await sendNotification({ user_id: recipientUserId, type: 'appointment_update', message: messageText });

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: updateRes.rows[0],
      message: `Appointment status updated to ${status}.`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating appointment:', error);
    return res.status(500).json({ success: false, message: 'Server error updating appointment status.' });
  } finally {
    client.release();
  }
});

// GET /:id (get single appointment details)
router.get('/:id', async (req, res) => {
  try {
    const apptRes = await pool.query(`SELECT * FROM appointments WHERE id = $1`, [req.params.id]);
    if (apptRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    
    const appointment = apptRes.rows[0];

    // Check ownership
    let isOwner = false;
    if (req.user.role === 'doctor') {
      const docRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
      if (docRes.rowCount > 0 && docRes.rows[0].id === appointment.doctor_id) isOwner = true;
    } else if (req.user.role === 'patient') {
      const patRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
      if (patRes.rowCount > 0 && patRes.rows[0].id === appointment.patient_id) isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied to this appointment.' });
    }

    return res.json({ success: true, data: appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching appointment.' });
  }
});

// PUT /:id/meeting (update meeting link)
router.put('/:id/meeting', async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Only doctors can add meeting links.' });
  }

  const { meeting_url, meeting_note } = req.body;
  
  if (!meeting_url || (!meeting_url.startsWith('http://') && !meeting_url.startsWith('https://'))) {
    return res.status(400).json({ success: false, message: 'A valid URL is required.' });
  }

  try {
    const updateRes = await pool.query(
      `UPDATE appointments SET meeting_url = $1, meeting_note = $2 WHERE id = $3 RETURNING *`,
      [meeting_url, meeting_note, req.params.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    
    const appointment = updateRes.rows[0];

    // Get patient user ID and doctor name
    const patRes = await pool.query('SELECT user_id FROM patient_profiles WHERE id = $1', [appointment.patient_id]);
    const docRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    
    if (patRes.rowCount > 0 && docRes.rowCount > 0) {
      const patientUserId = patRes.rows[0].user_id;
      const doctorName = docRes.rows[0].full_name;
      const formattedDate = new Date(appointment.scheduled_at).toLocaleDateString();
      
      await sendNotification({ user_id: patientUserId, type: 'meeting_link_added', message: `Dr. ${doctorName} has added a meeting link to your appointment on ${formattedDate}. You can now join your session.` });
    }

    return res.json({ success: true, data: appointment, message: 'Meeting link saved successfully.' });
  } catch (error) {
    console.error('Error updating meeting link:', error);
    return res.status(500).json({ success: false, message: 'Server error updating meeting link.' });
  }
});

module.exports = router;
