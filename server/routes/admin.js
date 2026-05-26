const { sendNotification } = require("../utils/notify");
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, checkRole } = require('../middleware/auth');

// Protect all admin routes
router.use(verifyToken);
router.use(checkRole(['admin']));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const patientsRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'patient'");
    const doctorsRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'doctor'");
    const pendingRes = await pool.query("SELECT COUNT(*) FROM doctor_profiles WHERE status = 'pending'");
    const consultationsRes = await pool.query("SELECT COUNT(*) FROM appointments WHERE DATE(scheduled_at) = CURRENT_DATE");

    return res.json({
      success: true,
      data: {
        totalPatients: parseInt(patientsRes.rows[0].count, 10),
        totalDoctors: parseInt(doctorsRes.rows[0].count, 10),
        pendingApprovals: parseInt(pendingRes.rows[0].count, 10),
        consultationsToday: parseInt(consultationsRes.rows[0].count, 10)
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching admin stats.' });
  }
});

// GET /api/admin/doctors/pending
router.get('/doctors/pending', async (req, res) => {
  try {
    const query = `
      SELECT d.*, u.full_name, u.email, u.phone, u.profile_photo_url, u.created_at
      FROM doctor_profiles d
      JOIN users u ON d.user_id = u.id
      WHERE d.status = 'pending'
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Fetch pending doctors error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching pending doctors.' });
  }
});

// POST /api/admin/doctors/:id/approve
router.post('/doctors/:id/approve', async (req, res) => {
  const doctorId = req.params.id; // this is doctor_profiles.id
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update doctor profile status
    const updateDoc = await client.query(
      `UPDATE doctor_profiles 
       SET status = 'approved', is_approved = true 
       WHERE id = $1 RETURNING user_id`,
      [doctorId]
    );

    if (updateDoc.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const userId = updateDoc.rows[0].user_id;

    // Update user verification
    await client.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);

    // Insert notification
    await sendNotification({ user_id: userId, type: 'system', message: 'Your account has been approved! You can now access all doctor features.' });

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Doctor approved successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve doctor error:', error);
    return res.status(500).json({ success: false, message: 'Server error approving doctor.' });
  } finally {
    client.release();
  }
});

// POST /api/admin/doctors/:id/reject
router.post('/doctors/:id/reject', async (req, res) => {
  const doctorId = req.params.id;
  const { reason } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update doctor profile status
    const updateDoc = await client.query(
      `UPDATE doctor_profiles 
       SET status = 'rejected', rejection_reason = $1 
       WHERE id = $2 RETURNING user_id`,
      [reason || 'No reason provided.', doctorId]
    );

    if (updateDoc.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const userId = updateDoc.rows[0].user_id;

    // Insert notification
    await sendNotification({ user_id: userId, type: 'system', message: `Your application was rejected. Reason: ${reason || 'Not specified'}.` });

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Doctor application rejected.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject doctor error:', error);
    return res.status(500).json({ success: false, message: 'Server error rejecting doctor.' });
  } finally {
    client.release();
  }
});

// GET /api/admin/doctors
router.get('/doctors', async (req, res) => {
  try {
    const query = `
      SELECT d.id as profile_id, d.status, d.specialization, d.hospital_affiliation, 
             u.id as user_id, u.full_name, u.email, u.phone, u.is_suspended, u.created_at
      FROM doctor_profiles d
      JOIN users u ON d.user_id = u.id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Fetch doctors error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching doctors.' });
  }
});

// GET /api/admin/patients
router.get('/patients', async (req, res) => {
  try {
    const query = `
      SELECT p.id as profile_id, 
             u.id as user_id, u.full_name, u.email, u.phone, u.is_suspended, u.created_at,
             doc_u.full_name as doctor_name
      FROM patient_profiles p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN doctor_profiles d ON p.connected_doctor_id = d.id
      LEFT JOIN users doc_u ON d.user_id = doc_u.id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Fetch patients error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching patients.' });
  }
});

// POST /api/admin/users/:id/suspend
router.post('/users/:id/suspend', async (req, res) => {
  const userId = req.params.id;
  try {
    const updateRes = await pool.query(
      `UPDATE users SET is_suspended = true WHERE id = $1 RETURNING id`,
      [userId]
    );
    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, message: 'User suspended successfully.' });
  } catch (error) {
    console.error('Suspend user error:', error);
    return res.status(500).json({ success: false, message: 'Server error suspending user.' });
  }
});

// POST /api/admin/users/:id/unsuspend
router.post('/users/:id/unsuspend', async (req, res) => {
  const userId = req.params.id;
  try {
    const updateRes = await pool.query(
      `UPDATE users SET is_suspended = false WHERE id = $1 RETURNING id`,
      [userId]
    );
    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, message: 'User unsuspended successfully.' });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    return res.status(500).json({ success: false, message: 'Server error unsuspending user.' });
  }
});

module.exports = router;
