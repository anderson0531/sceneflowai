require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function check() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL });
  
  try {
    const res = await pool.query(`
      SELECT id, title, metadata 
      FROM "Projects" 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    const project = res.rows[0];
    if (project) {
      console.log('Project ID:', project.id);
      console.log('Title:', project.title);
      console.log('Metadata keys:', Object.keys(project.metadata || {}));
      console.log('Has blueprintPrimeInput:', !!project.metadata?.blueprintPrimeInput);
      if (project.metadata?.blueprintPrimeInput) {
        console.log('blueprintPrimeInput length:', project.metadata.blueprintPrimeInput.length);
      }
    } else {
      console.log('No projects found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
