const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function sendNotification({ user_id, type, message }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id, type, message })
    .select().single()
  if (error) console.error('Notification error:', error.message)
  return data
}

module.exports = { sendNotification }
