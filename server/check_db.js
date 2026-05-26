const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runFix() {
  try {
    await pool.query("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS address TEXT");
    console.log("Address column added successfully.");
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}
runFix();
