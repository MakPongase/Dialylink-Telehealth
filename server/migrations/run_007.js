const fs = require('fs');
const pool = require('../db/pool');
const path = require('path');

const run = async () => {
  const sql = fs.readFileSync(path.join(__dirname, '007_add_meeting_url.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration 007 completed');
  process.exit(0);
};

run().catch(console.error);
