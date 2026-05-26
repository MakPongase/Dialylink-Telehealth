const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

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
    console.log('Running migration...');
    const sql = fs.readFileSync(path.join(__dirname, 'migration5.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database migration successfully executed!');
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
