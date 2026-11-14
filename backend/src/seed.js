import bcrypt from 'bcryptjs';
import { query, pool } from './db.js';
import { config } from './config.js';

if (!config.adminEmail || !config.adminPassword) {
  console.error("ADMIN_EMAIL va ADMIN_PASSWORD .env faylida bo'lishi kerak");
  process.exit(1);
}
const hash = await bcrypt.hash(config.adminPassword, 12);
await query(
  `INSERT INTO users (name, email, password_hash, role, email_verified)
   VALUES ('Admin', $1, $2, 'admin', true)
   ON CONFLICT (email) DO UPDATE
     SET role = 'admin', password_hash = EXCLUDED.password_hash, deleted_at = NULL, email_verified = true`,
  [config.adminEmail.toLowerCase(), hash]
);
console.log(`Admin tayyor: ${config.adminEmail}`);
await pool.end();
