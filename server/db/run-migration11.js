const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Running migration11...');
    const sql = fs.readFileSync(path.join(__dirname, 'migration11.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database migration successfully executed! Onboarding and privacy settings columns added.');
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
