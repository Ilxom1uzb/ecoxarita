import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { HttpError } from '../errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validation.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

const publicUser = (u) => ({ id: String(u.id), name: u.name, email: u.email, role: u.role });

router.post('/register', authLimiter, async (req, res) => {
  const body = registerSchema.parse(req.body);
  const hash = await bcrypt.hash(body.password, 12);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, role`,
      [body.name, body.email, hash]
    );
    res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'email_taken');
    throw e;
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const body = loginSchema.parse(req.body);
  const { rows } = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL',
    [body.email]
  );
  const u = rows[0];
  const ok = u && (await bcrypt.compare(body.password, u.password_hash));
  if (!ok) throw new HttpError(401, 'invalid_credentials');
  res.json({ token: signToken(u), user: publicUser(u) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Play Store talabi: foydalanuvchi o'z akkauntini o'chira olishi kerak.
// Ma'lumot anonimlashtiriladi, hisobotlar jamoat uchun qoladi.
router.delete('/me', requireAuth, async (req, res) => {
  await query(
    `UPDATE users SET name = 'Deleted user', email = $2, password_hash = '', deleted_at = now()
     WHERE id = $1`,
    [req.user.id, `deleted-${req.user.id}@deleted.invalid`]
  );
  res.status(204).end();
});

export default router;
