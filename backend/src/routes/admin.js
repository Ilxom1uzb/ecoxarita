import { Router } from 'express';
import { query } from '../db.js';
import { HttpError } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { roleSchema } from '../validation.js';

const router = Router();

router.get('/users', requireAuth, requireRole('admin'), async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            (SELECT count(*) FROM reports r WHERE r.user_id = u.id)::int AS report_count
     FROM users u WHERE u.deleted_at IS NULL
     ORDER BY u.created_at DESC LIMIT 200`
  );
  res.json({ items: rows.map((u) => ({ ...u, id: String(u.id) })) });
});

router.patch('/users/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(400, 'bad_request');
  if (String(req.user.id) === req.params.id) throw new HttpError(400, 'self_role');
  const { role } = roleSchema.parse(req.body);
  const { rowCount } = await query(
    'UPDATE users SET role = $1 WHERE id = $2 AND deleted_at IS NULL',
    [role, req.params.id]
  );
  if (!rowCount) throw new HttpError(404, 'not_found');
  res.status(204).end();
});

export default router;
