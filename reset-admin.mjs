import crypto from 'crypto';
import { promisify } from 'util';
import pg from 'pg';

const scryptAsync = promisify(crypto.scrypt);

async function resetAdminPassword() {
  const pool = new pg.Pool({
    connectionString: 'postgresql://ugc_app:ugc%402026@localhost:5432/ugc_it_service'
  });

  try {
    const password = 'GqmZAaujV_xL%FiosUyz8P4hD-Qf';
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt, 64);
    const passwordHash = `scrypt$${salt}$${derivedKey.toString('hex')}`;

    const result = await pool.query(
      'UPDATE users SET password = $1, password_hash = $2 WHERE email = $3',
      ['__managed__', passwordHash, 'mmarufalamj@gmail.com']
    );

    console.log(`Updated ${result.rowCount} user(s)`);
    console.log('✓ Admin password reset successfully');
  } finally {
    await pool.end();
  }
}

resetAdminPassword().catch(console.error);
