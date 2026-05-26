const pool = require('../db/pool');

const sql = `
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(patient_id, doctor_id)
);
`;

pool.query(sql).then(() => {
  console.log('Migration completed');
  process.exit(0);
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
