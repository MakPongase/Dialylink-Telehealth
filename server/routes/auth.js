const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

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

    // Check uniqueness
    const res = await pool.query('SELECT 1 FROM doctor_profiles WHERE connection_code = $1', [code]);
    if (res.rowCount === 0) {
      isUnique = true;
    }
    attempts++;
  }
  return code;
}

router.post('/register', async (req, res) => {
  const { 
    full_name, email, password, role, 
    license_number, specialization, years_experience, 
    hospital_affiliation, phone, address, city, province, bio, 
    profile_photo_url, prc_doc_url,
    date_of_birth, blood_type, emergency_contact_name, emergency_contact_phone
  } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (role !== 'patient' && role !== 'doctor') {
    return res.status(400).json({ success: false, message: 'Invalid role selection.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user already exists
    const checkUser = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (checkUser.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const insertUserRes = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, profile_photo_url) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role, full_name`,
      [email.toLowerCase(), passwordHash, role, full_name, phone || null, profile_photo_url || null]
    );
    const user = insertUserRes.rows[0];

    // Role-specific profile setup
    if (role === 'doctor') {
      const connectionCode = await generateConnectionCode();
      await client.query(
        `INSERT INTO doctor_profiles 
         (user_id, license_number, specialization, connection_code, is_approved, status, hospital_affiliation, years_experience, prc_doc_url, bio, address, practice_city, practice_province) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          user.id, 
          license_number || 'PENDING', 
          specialization || 'General Nephrology', 
          connectionCode, 
          false, 
          'pending',
          hospital_affiliation || null,
          years_experience || 0,
          prc_doc_url || null,
          bio || null,
          address || null,
          city || null,
          province || null
        ]
      );
    } else if (role === 'patient') {
      await client.query(
        `INSERT INTO patient_profiles (user_id, address, city, province, date_of_birth, blood_type, emergency_contact_name, emergency_contact_phone) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id, address || null, city || null, province || null,
          date_of_birth || null, blood_type || null, emergency_contact_name || null, emergency_contact_phone || null
        ]
      );
    }

    await client.query('COMMIT');

    // Issue JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      },
      message: 'Registration successful.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  } finally {
    client.release();
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userRes.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const user = userRes.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    let approved = true;
    if (user.role === 'doctor') {
      const docRes = await pool.query('SELECT is_approved FROM doctor_profiles WHERE user_id = $1', [user.id]);
      if (docRes.rowCount > 0 && docRes.rows[0].is_approved === false) {
        approved = false;
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_verified: user.is_verified
        },
        ...(user.role === 'doctor' ? { approved } : {})
      },
      message: 'Login successful.'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id, email, role, full_name, phone, profile_photo_url, is_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRes.rows[0];
    let profileData = {};

    if (user.role === 'doctor') {
      const docRes = await pool.query('SELECT * FROM doctor_profiles WHERE user_id = $1', [user.id]);
      if (docRes.rowCount > 0) profileData = docRes.rows[0];
    } else if (user.role === 'patient') {
      const patRes = await pool.query(
        `SELECT p.*, u.full_name as doctor_name 
         FROM patient_profiles p
         LEFT JOIN doctor_profiles d ON p.connected_doctor_id = d.id
         LEFT JOIN users u ON d.user_id = u.id
         WHERE p.user_id = $1`,
        [user.id]
      );
      if (patRes.rowCount > 0) profileData = patRes.rows[0];
    }

    return res.json({
      success: true,
      data: {
        user,
        profile: profileData
      }
    });

  } catch (error) {
    console.error('Fetch me error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user details.' });
  }
});

module.exports = router;
