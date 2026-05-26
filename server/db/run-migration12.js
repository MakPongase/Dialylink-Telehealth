const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migration12.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migration 12 (location columns) ran successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    pool.end();
  }
}

runMigration();
