require('dotenv').config({ path: '../.env.local' });
const pool = require('./pool');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migration6.sql'), 'utf8');
    
    // Split on statements to avoid multi-statement issues if there are any, or just run the whole thing
    // The previous migration failed due to syntax, so let's run it directly
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let stmt of statements) {
      console.log('Running:', stmt.substring(0, 50) + '...');
      await pool.query(stmt + ';');
    }
    
    console.log('Migration 6 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
