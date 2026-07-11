require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'::jsonb;');
    await pool.query('ALTER TABLE pets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'::jsonb;');
    console.log('OK');
  } catch(e) { console.error(e); } finally { pool.end(); }
}
run();
