const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Protect all routes under /api/chat
router.use(verifyToken);

// Helper: get Supabase admin client
function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/chat/contacts/list
// IMPORTANT: This must come BEFORE /:recipientId or Express will treat "contacts" as a param
// Get a list of users the current user can chat with
router.get('/contacts/list', async (req, res) => {
  const currentUserId = req.user.id;
  const role = req.user.role;

  try {
    let contacts = [];

    if (role === 'doctor') {
      // Doctor can chat with their connected patients (user list from Neon)
      const docProfileRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1::uuid', [currentUserId]);
      if (docProfileRes.rowCount > 0) {
        const patientsRes = await pool.query(
          `SELECT u.id as user_id, u.full_name as name, u.profile_photo_url
           FROM patient_profiles pp
           JOIN users u ON pp.user_id = u.id
           WHERE pp.connected_doctor_id = $1::uuid`,
          [docProfileRes.rows[0].id]
        );
        contacts = patientsRes.rows;
      }
    } else if (role === 'patient') {
      // Patient can chat with their connected doctor (user list from Neon)
      const patProfileRes = await pool.query('SELECT connected_doctor_id FROM patient_profiles WHERE user_id = $1::uuid', [currentUserId]);
      if (patProfileRes.rowCount > 0 && patProfileRes.rows[0].connected_doctor_id) {
        const docRes = await pool.query(
          `SELECT u.id as user_id, u.full_name as name, u.profile_photo_url, dp.specialization
           FROM doctor_profiles dp
           JOIN users u ON dp.user_id = u.id
           WHERE dp.id = $1::uuid`,
          [patProfileRes.rows[0].connected_doctor_id]
        );
        contacts = docRes.rows;
      }
    }

    // Fetch unread counts from Supabase (where messages are stored)
    if (contacts.length > 0) {
      try {
        const supabase = getSupabase();
        const { data: unreadMessages } = await supabase
          .from('chat_messages')
          .select('sender_id')
          .eq('receiver_id', currentUserId)
          .eq('is_read', false);

        if (unreadMessages) {
          const counts = {};
          unreadMessages.forEach(msg => {
            counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
          });
          contacts = contacts.map(c => ({
            ...c,
            unread_count: counts[c.user_id] || 0
          }));
        }
      } catch (supabaseErr) {
        // If Supabase fails (e.g. table not created yet), still return contacts with 0 unread
        console.error('Supabase unread count error (non-fatal):', supabaseErr.message);
        contacts = contacts.map(c => ({ ...c, unread_count: 0 }));
      }
    }

    return res.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching contacts.' });
  }
});

// GET /api/chat/:recipientId
// Get conversation history with a specific user
router.get('/:recipientId', async (req, res) => {
  const currentUserId = req.user.id;
  const recipientId = req.params.recipientId;

  try {
    const supabase = getSupabase();

    // Fetch messages from Supabase
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark messages as read
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('receiver_id', currentUserId)
      .eq('sender_id', recipientId)
      .eq('is_read', false);

    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching chat history.' });
  }
});

// POST /api/chat
// Send a new message
router.post('/', async (req, res) => {
  const currentUserId = req.user.id;
  const { receiver_id, message } = req.body;

  if (!receiver_id || !message || message.trim() === '') {
    return res.status(400).json({ success: false, message: 'Receiver ID and message content are required.' });
  }

  try {
    const supabase = getSupabase();

    const { data: insertRes, error } = await supabase
      .from('chat_messages')
      .insert([
        { sender_id: currentUserId, receiver_id: receiver_id, message: message.trim() }
      ])
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: insertRes[0],
      message: 'Message sent successfully.'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ success: false, message: 'Server error sending message.' });
  }
});

module.exports = router;
