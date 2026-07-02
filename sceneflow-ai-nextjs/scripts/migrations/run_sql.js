const pg = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const { DATABASE_URL_DIRECT, POSTGRES_URL_NON_POOLING, SUPABASE_DATABASE_URL, DATABASE_URL } = process.env;
  
  // Use the pooling URL for the migration to avoid the session pooler issue if we only have the standard connection string
  let connectionString = POSTGRES_URL_NON_POOLING || DATABASE_URL_DIRECT || SUPABASE_DATABASE_URL || DATABASE_URL;
  
  if (!connectionString) {
    console.error('No database connection string found in .env.local');
    return;
  }
  
  // Quick fix: If we are using the transaction pooler (port 6543) or session pooler (port 5432) 
  // on Supabase, the pg client needs the connection string to be correctly formatted.
  // We'll trust whatever valid string we grabbed.

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlPath = path.join(__dirname, 'add_scene_id_to_render_jobs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    const result = await client.query(sql);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
