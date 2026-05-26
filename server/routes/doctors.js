const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, checkRole } = require('../middleware/auth');

// Protect all routes with authentication
router.use(verifyToken);

// GET /api/doctors/directory
router.get('/directory', async (req, res) => {
  const { specialization, search } = req.query;

  try {
    let query = `
      SELECT dp.id, u.id as user_id, u.full_name, u.profile_photo_url, 
             dp.specialization, dp.years_of_experience, dp.hospital_affiliation, dp.bio
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.is_approved = true
      AND dp.is_listed = true
      AND dp.accepting_patients = true
    `;
    const params = [];
    let paramCount = 1;

    if (specialization) {
      query += ` AND dp.specialization ILIKE $${paramCount}`;
      params.push(`%${specialization}%`);
      paramCount++;
    }

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramCount} OR dp.hospital_affiliation ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const docRes = await pool.query(query, params);

    return res.json({
      success: true,
      data: docRes.rows
    });
  } catch (error) {
    console.error('Error fetching doctors directory:', error);
    return res.status(500).json({ success: false, message: 'Server error loading doctors directory.' });
  }
});

// GET /api/doctors/:id/availability
router.get('/:id/availability', async (req, res) => {
  try {
    const doctorUserId = req.params.id;
    if (!doctorUserId || doctorUserId === 'undefined') {
      return res.json({ success: true, data: { availability: [], blocked_dates: [], booked_slots: [], date_overrides: [] } });
    }
    
    // Fetch regular availability
    const availRes = await pool.query(
      `SELECT day_of_week, start_time, end_time, is_available FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week ASC`,
      [doctorUserId]
    );
    
    // Fetch blocked dates
    const blockedRes = await pool.query(
      `SELECT blocked_date FROM doctor_blocked_dates WHERE doctor_id = $1`,
      [doctorUserId]
    );

    // Fetch date overrides
    const overridesRes = await pool.query(
      `SELECT override_date, start_time, end_time, is_available FROM doctor_date_overrides WHERE doctor_id = $1`,
      [doctorUserId]
    );

    // Fetch booked slots (get doctor profile id first)
    const docProfileRes = await pool.query(`SELECT id FROM doctor_profiles WHERE user_id = $1`, [doctorUserId]);
    let bookedSlots = [];
    
    if (docProfileRes.rowCount > 0) {
      const doctorProfileId = docProfileRes.rows[0].id;
      const apptsRes = await pool.query(
        `SELECT scheduled_at FROM appointments 
         WHERE doctor_id = $1 AND status != 'cancelled' AND scheduled_at >= CURRENT_DATE`,
        [doctorProfileId]
      );
      bookedSlots = apptsRes.rows.map(row => {
        const d = new Date(row.scheduled_at);
        // Return ISO string for exact matching or standard format? 
        // We will just return the ISO string so frontend can format it locally
        return d.toISOString();
      });
    }

    return res.json({
      success: true,
      data: {
        availability: availRes.rows,
        blocked_dates: blockedRes.rows.map(row => row.blocked_date),
        booked_slots: bookedSlots,
        date_overrides: overridesRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    return res.status(500).json({ success: false, message: 'Server error loading availability.' });
  }
});

module.exports = router;
