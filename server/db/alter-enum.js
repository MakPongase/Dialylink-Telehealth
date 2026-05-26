require('dotenv').config({ path: '../../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`ALTER TYPE appointment_type ADD VALUE IF NOT EXISTS 'Routine Check'`);
    await pool.query(`ALTER TYPE appointment_type ADD VALUE IF NOT EXISTS 'Consultation'`);
    console.log('Enums added successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
