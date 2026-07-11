require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Adding deleted_at column...');
    await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;');
    await pool.query('ALTER TABLE pets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;');
    await pool.query('ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;');
    await pool.query('ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;');
    await pool.query('ALTER TABLE servicos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;');
    console.log('OK');
  } catch(e) { 
    console.error(e); 
  } finally { 
    pool.end(); 
  }
}
run();
