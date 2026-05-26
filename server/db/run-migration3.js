require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_iHlGn0AXKaB7@ep-soft-block-aorz6k8p.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migration3.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration 3...');
    await pool.query(sql);
    console.log('Migration 3 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
