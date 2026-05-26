const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Protect all routes under /api/notifications with verifyToken
router.use(verifyToken);

// GET / (list notifications and count unread)
router.get('/', async (req, res) => {
  try {
    const { data: notifications, error: listError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (listError) throw listError;

    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (countError) throw countError;

    return res.json({
      success: true,
      data: {
        notifications: notifications || [],
        unread_count: count || 0
      }
    });

  } catch (error) {
    console.error('Error fetching notifications from Supabase:', error);
    return res.status(500).json({ success: false, message: 'Server error loading notifications.' });
  }
});

// GET /latest (Returns only the most recent 1 notification for the user)
router.get('/latest', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, message, is_read, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const notification = data && data.length > 0 ? data[0] : null;
    res.json({ notification });
  } catch (error) {
    console.error('Error fetching latest notification:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

// PUT /:id/read (mark notification as read)
router.put('/:id/read', async (req, res) => {
  const notificationId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', req.user.id)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or access denied.' });
    }

    return res.json({
      success: true,
      data: data[0],
      message: 'Notification marked as read.'
    });

  } catch (error) {
    console.error('Error marking notification as read in Supabase:', error);
    return res.status(500).json({ success: false, message: 'Server error updating notification status.' });
  }
});

module.exports = router;
