const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from root .env.local first, then fall back to .env
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

console.log('Connecting to database...');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Required for Neon connection
  }
});

async function runSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema SQL statements...');
    await pool.query(schemaSql);
    console.log('Database tables successfully created!');

  } catch (error) {
    console.error('Error running schema seed:', error);
  } finally {
    await pool.end();
    console.log('Database pool connection closed.');
  }
}

runSchema();
