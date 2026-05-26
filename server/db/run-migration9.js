require('dotenv').config({ path: '../../.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Running migration 9...');
    const sql = fs.readFileSync(path.join(__dirname, 'migration9.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migration 9 completed successfully.');
  } catch (error) {
    console.error('Error running migration 9:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
