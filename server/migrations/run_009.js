const fs = require('fs');
const pool = require('../db/pool');
const path = require('path');

const run = async () => {
  const sql = fs.readFileSync(path.join(__dirname, '009_drop_notifications.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration 009 completed');
  process.exit(0);
};

run().catch(console.error);
