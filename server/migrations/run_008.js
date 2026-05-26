const fs = require('fs');
const pool = require('../db/pool');
const path = require('path');

const run = async () => {
  const sql = fs.readFileSync(path.join(__dirname, '008_add_dialysis_type.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration 008 completed');
  process.exit(0);
};

run().catch(console.error);
