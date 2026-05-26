const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanBadNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .like('message', '%${doctorName}%');

  if (error) {
    console.error('Error deleting bad notifications:', error.message);
  } else {
    console.log('Successfully cleaned up bad notifications with literal ${doctorName}.');
  }
}

cleanBadNotifications();
