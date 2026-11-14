import crypto from 'node:crypto';
import { query } from './db.js';
import { config } from './config.js';
import { HttpError } from './errors.js';
import { sendMail } from './mailer.js';

const TTL_MIN = 10;          // kod amal qilish muddati
const MAX_ATTEMPTS = 5;      // bitta kod uchun noto'g'ri urinishlar
const COOLDOWN_SEC = 60;     // ikki kod orasidagi minimal vaqt
const MAX_PER_HOUR = 5;      // bir soatda foydalanuvchiga maksimal kod

// Kod bazada ochiq holda saqlanmaydi, HMAC bilan hash qilinadi
const digest = (userId, purpose, code) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${userId}:${purpose}:${code}`).digest('hex');

export async function issueCode(user, purpose) {
  const { rows } = await query(
    `SELECT count(*)::int AS n, max(created_at) AS last FROM auth_codes
     WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
    [user.id]
  );
  const { n, last } = rows[0];
  if (n >= MAX_PER_HOUR) throw new HttpError(429, 'rate_limited');
  if (last && Date.now() - new Date(last).getTime() < COOLDOWN_SEC * 1000) {
    throw new HttpError(429, 'too_soon');
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  // Oldingi faol kodlarni bekor qilamiz: faqat oxirgi kod ishlaydi
  await query(
    `UPDATE auth_codes SET expires_at = now() WHERE user_id = $1 AND purpose = $2 AND expires_at > now()`,
    [user.id, purpose]
  );
  await query(
    `INSERT INTO auth_codes (user_id, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [user.id, purpose, digest(user.id, purpose, code), TTL_MIN]
  );
  await sendMail(user.email, purpose, code);
}

export async function verifyCode(user, purpose, code) {
  const { rows } = await query(
    `SELECT id, code_hash, attempts FROM auth_codes
     WHERE user_id = $1 AND purpose = $2 AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [user.id, purpose]
  );
  const row = rows[0];
  if (!row || row.attempts >= MAX_ATTEMPTS) throw new HttpError(400, 'code_invalid');

  const a = Buffer.from(row.code_hash);
  const b = Buffer.from(digest(user.id, purpose, code));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    await query('UPDATE auth_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    throw new HttpError(400, 'code_invalid');
  }
  // Bir martalik: kod ishlatilgandan keyin bekor qilinadi
  await query('UPDATE auth_codes SET expires_at = now() WHERE id = $1', [row.id]);
}
