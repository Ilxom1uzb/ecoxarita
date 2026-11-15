import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { HttpError } from '../errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { registerSchema, loginSchema, verifySchema } from '../validation.js';
import { issueCode, verifyCode } from '../codes.js';

const router = Router();

const limiter = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'rate_limited' },
  });
const authLimiter = limiter(30);    // parol urinishlari (IP bo'yicha)
const verifyLimiter = limiter(20);  // kod kiritish urinishlari (IP bo'yicha)

const publicUser = (u) => ({ id: String(u.id), name: u.name, email: u.email, role: u.role });

// 1) Ro'yxatdan o'tish: ma'lumot saqlanadi, tasdiqlash kodi yuboriladi
router.post('/register', authLimiter, async (req, res) => {
  const body = registerSchema.parse(req.body);
  const existing = (
    await query('SELECT id, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL', [body.email])
  ).rows[0];
  if (existing?.email_verified) throw new HttpError(409, 'email_taken');

  const hash = await bcrypt.hash(body.password, 12);
  let user;
  try {
    user = existing
      ? (
          await query(
            'UPDATE users SET name = $2, password_hash = $3 WHERE id = $1 RETURNING id, name, email, role',
            [existing.id, body.name, hash]
          )
        ).rows[0]
      : (
          await query(
            `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
             RETURNING id, name, email, role`,
            [body.name, body.email, hash]
          )
        ).rows[0];
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'email_taken');
    throw e;
  }

  await issueCode(user, 'register');
  res.status(202).json({ pending: 'register', email: user.email });
});

// 2) Ro'yxatdan o'tish kodini tasdiqlash
router.post('/register/verify', verifyLimiter, async (req, res) => {
  const { email, code } = verifySchema.parse(req.body);
  const { rows } = await query(
    'SELECT id, name, email, role FROM users WHERE email = $1 AND deleted_at IS NULL AND email_verified = false',
    [email]
  );
  if (!rows[0]) throw new HttpError(400, 'code_invalid');
  await verifyCode(rows[0], 'register', code);
  await query('UPDATE users SET email_verified = true WHERE id = $1', [rows[0].id]);
  res.json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
});

// 3) Kirish, 1-bosqich: parol to'g'ri bo'lsa, kirish kodi yuboriladi
router.post('/login', authLimiter, async (req, res) => {
  const body = loginSchema.parse(req.body);
  const u = (
    await query(
      'SELECT id, name, email, role, password_hash, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL',
      [body.email]
    )
  ).rows[0];
  const ok = u && (await bcrypt.compare(body.password, u.password_hash));
  if (!ok) throw new HttpError(401, 'invalid_credentials');

  // Tasdiqlanmagan hisob: avval email tasdiqlanadi
  if (!u.email_verified) {
    await issueCode(u, 'register');
    return res.status(202).json({ pending: 'register', email: u.email });
  }
  await issueCode(u, 'login');
  res.status(202).json({ pending: 'login', email: u.email });
});

// 4) Kirish, 2-bosqich: kod to'g'ri bo'lsa, token beriladi
router.post('/login/verify', verifyLimiter, async (req, res) => {
  const { email, code } = verifySchema.parse(req.body);
  const { rows } = await query(
    'SELECT id, name, email, role FROM users WHERE email = $1 AND deleted_at IS NULL AND email_verified = true',
    [email]
  );
  if (!rows[0]) throw new HttpError(400, 'code_invalid');
  await verifyCode(rows[0], 'login', code);
  res.json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Play Store talabi: akkauntni o'chirish (anonimlashtirish)
router.delete('/me', requireAuth, async (req, res) => {
  await query(
    `UPDATE users SET name = 'Deleted user', email = $2, password_hash = '', deleted_at = now(), email_verified = false
     WHERE id = $1`,
    [req.user.id, `deleted-${req.user.id}@deleted.invalid`]
  );
  res.status(204).end();
});

export default router;
