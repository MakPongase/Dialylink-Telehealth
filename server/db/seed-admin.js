const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Error: ADMIN_EMAIL or ADMIN_PASSWORD is not defined in .env.local');
  console.error('Please add them to the root .env.local file to seed the admin account.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function seedAdmin() {
  try {
    console.log(`Checking if admin user ${adminEmail} exists...`);
    
    // Check if the user already exists
    const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail.toLowerCase()]);
    
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    if (checkUser.rowCount > 0) {
      console.log('Admin user already exists. Updating password and role to ensure admin privileges...');
      await pool.query(
        `UPDATE users SET password_hash = $1, role = 'admin', is_verified = true WHERE email = $2`,
        [passwordHash, adminEmail.toLowerCase()]
      );
      console.log('Admin user updated successfully.');
    } else {
      console.log('Admin user not found. Creating new admin account...');
      await pool.query(
        `INSERT INTO users (email, password_hash, role, full_name, is_verified) 
         VALUES ($1, $2, 'admin', 'Dialylink Admin', true)`,
        [adminEmail.toLowerCase(), passwordHash]
      );
      console.log('Admin account created successfully.');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await pool.end();
  }
}

seedAdmin();
