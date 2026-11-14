import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from '../errors.js';
import { MODERATOR_ROLES } from '../constants.js';

export const signToken = (user) =>
  jwt.sign({ sub: String(user.id) }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });

// Har so'rovda foydalanuvchi bazadan qayta o'qiladi: rol o'zgarishi darhol kuchga kiradi,
// o'chirilgan akkaunt esa darhol bloklanadi
export async function requireAuth(req, _res, next) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(\S+)$/);
  if (!m) return next(new HttpError(401, 'unauthorized'));

  let payload;
  try {
    payload = jwt.verify(m[1], config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return next(new HttpError(401, 'unauthorized'));
  }

  try {
    const { rows } = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND deleted_at IS NULL',
      [payload.sub]
    );
    if (!rows[0]) return next(new HttpError(401, 'unauthorized'));
    req.user = rows[0];
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'forbidden'));

export const isModerator = (user) => MODERATOR_ROLES.includes(user.role);
