require('dotenv').config({ path: '../../.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Running migration 8...');
    const sql = fs.readFileSync(path.join(__dirname, 'migration8.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migration 8 completed successfully.');
  } catch (error) {
    console.error('Error running migration 8:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
