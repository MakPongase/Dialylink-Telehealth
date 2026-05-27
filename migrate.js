const pool = require('./server/db/pool');

async function migrate() {
  try {
    await pool.query("ALTER TABLE dialysis_sessions ADD COLUMN IF NOT EXISTS logged_by_role VARCHAR(20) DEFAULT 'patient'");
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();
