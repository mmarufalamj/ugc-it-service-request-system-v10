import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const pgUrl = process.env.DATABASE_URL?.trim();

(async () => {
  console.log('\n✅ PostgreSQL Connection Test:');
  console.log('='.repeat(60));
  
  if (!pgUrl) {
    console.log('❌ DATABASE_URL not found');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: pgUrl });
  
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connected to PostgreSQL!');
    console.log(`   Database: ugc_it_service`);
    console.log(`   Server time: ${result.rows[0].current_time}`);
    
    // Check data
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`   Users in DB: ${usersResult.rows[0].count}`);
    
    console.log('\n✨ Ready for testing!');
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
