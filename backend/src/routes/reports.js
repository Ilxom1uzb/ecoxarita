import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { query, pool } from '../db.js';
import { HttpError } from '../errors.js';
import { requireAuth, requireRole, isModerator } from '../middleware/auth.js';
import { photoUpload, verifyImage, removeFile } from '../upload.js';
import { reportSchema, reportPatchSchema, statusSchema, listQuerySchema } from '../validation.js';
import { DUPLICATE_RADIUS_M, MODERATOR_ROLES } from '../constants.js';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

// $p - ko'ruvchi foydalanuvchi id parametri
const COLS = (p) => `
  r.id, r.waste_type, r.volume_value, r.volume_unit, r.lat, r.lng, r.address, r.description,
  r.photo_path, r.status, r.created_at, r.updated_at, r.cleaned_at,
  (r.user_id = $${p})::boolean AS is_mine,
  EXISTS (SELECT 1 FROM report_confirmations c WHERE c.report_id = r.id AND c.user_id = $${p}) AS confirmed_by_me,
  (SELECT count(*) FROM report_confirmations c WHERE c.report_id = r.id)::int AS confirmations`;

// Muallif haqida ma'lumot (ism, email) hech qachon ochiq API'da chiqarilmaydi
const toDto = (r) => ({
  id: Number(r.id),
  waste_type: r.waste_type,
  volume_value: Number(r.volume_value),
  volume_unit: r.volume_unit,
  lat: r.lat,
  lng: r.lng,
  address: r.address,
  description: r.description,
  photo_url: r.photo_path ? `/uploads/${path.basename(r.photo_path)}` : null,
  status: r.status,
  confirmations: r.confirmations,
  confirmed_by_me: r.confirmed_by_me,
  is_mine: r.is_mine,
  created_at: r.created_at,
  updated_at: r.updated_at,
  cleaned_at: r.cleaned_at,
});

const parseId = (v) => {
  if (!/^\d{1,18}$/.test(v)) throw new HttpError(400, 'bad_request');
  return v;
};

async function loadReport(id, viewerId) {
  const { rows } = await query(`SELECT ${COLS(2)} FROM reports r WHERE r.id = $1`, [id, viewerId]);
  return rows[0] ? toDto(rows[0]) : null;
}

// Gaversin formulasi: ikki nuqta orasidagi masofa (metr)
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findDuplicate(type, lat, lng, viewerId) {
  const m = 0.0006; // ~60 m oynacha, keyin aniq masofa tekshiriladi
  const { rows } = await query(
    `SELECT ${COLS(6)} FROM reports r
     WHERE r.waste_type = $1 AND r.status <> 'hidden'
       AND r.lat BETWEEN $2 AND $3 AND r.lng BETWEEN $4 AND $5`,
    [type, lat - m, lat + m, lng - m, lng + m, viewerId]
  );
  const hit = rows.find((r) => haversine(lat, lng, r.lat, r.lng) <= DUPLICATE_RADIUS_M);
  return hit ? toDto(hit) : null;
}

// ---------- Ro'yxat va o'qish ----------

router.get('/', requireAuth, async (req, res) => {
  const q = listQuerySchema.parse(req.query);
  const mod = isModerator(req.user);
  const params = [req.user.id];
  const where = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (q.status === 'hidden') {
    if (!mod) throw new HttpError(403, 'forbidden');
    where.push(`r.status = 'hidden'`);
  } else {
    where.push(`r.status <> 'hidden'`);
    if (q.status) add('r.status = ?', q.status);
  }
  if (q.type) add('r.waste_type = ?', q.type);
  if (q.onlyOpen === '1') where.push(`r.status <> 'cleaned'`);
  if (q.bbox) {
    const [w, s, e, n] = q.bbox.split(',').map(Number);
    if (w > e || s > n) throw new HttpError(400, 'bad_request');
    params.push(s, n, w, e);
    const k = params.length;
    where.push(`r.lat BETWEEN $${k - 3} AND $${k - 2} AND r.lng BETWEEN $${k - 1} AND $${k}`);
  }

  params.push(q.limit, (q.page - 1) * q.limit);
  const k = params.length;
  const { rows } = await query(
    `SELECT ${COLS(1)} FROM reports r
     WHERE ${where.join(' AND ')}
     ORDER BY r.created_at DESC LIMIT $${k - 1} OFFSET $${k}`,
    params
  );
  res.json({ items: rows.map(toDto), page: q.page, hasMore: rows.length === q.limit });
});

router.get('/mine', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT ${COLS(1)} FROM reports r WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 200`,
    [req.user.id]
  );
  res.json({ items: rows.map(toDto) });
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const report = await loadReport(id, req.user.id);
  if (!report) throw new HttpError(404, 'not_found');
  if (report.status === 'hidden' && !report.is_mine && !isModerator(req.user)) {
    throw new HttpError(404, 'not_found');
  }
  res.json(report);
});

router.get('/:id/events', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const { rows } = await query(
    `SELECT old_status, new_status, note, actor_role, created_at
     FROM report_events WHERE report_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  res.json({ items: rows });
});

// ---------- Yaratish (dublikat tekshiruvi bilan) ----------

router.post('/', createLimiter, requireAuth, photoUpload, async (req, res) => {
  let saved = false;
  try {
    const body = reportSchema.parse(req.body);
    if (req.file) await verifyImage(req.file.path);

    const dup = await findDuplicate(body.waste_type, body.lat, body.lng, req.user.id);
    if (dup) throw new HttpError(409, 'duplicate', { duplicate: dup });

    const { rows } = await query(
      `INSERT INTO reports (user_id, waste_type, volume_value, volume_unit, lat, lng, address, description, photo_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        req.user.id, body.waste_type, body.volume_value, body.volume_unit,
        body.lat, body.lng, body.address, body.description,
        req.file ? req.file.path : null,
      ]
    );
    saved = true;
    res.status(201).json(await loadReport(rows[0].id, req.user.id));
  } catch (e) {
    if (!saved) await removeFile(req.file);
    throw e;
  }
});

// Mavjud hisobotni tasdiqlash (dublikat holatida). Har foydalanuvchi bir marta tasdiqlaydi.
router.post('/:id/confirm', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const { rows } = await query('SELECT user_id, status FROM reports WHERE id = $1', [id]);
  const r = rows[0];
  if (!r || r.status === 'hidden') throw new HttpError(404, 'not_found');
  if (String(r.user_id) === String(req.user.id)) throw new HttpError(400, 'own_report');
  await query(
    'INSERT INTO report_confirmations (report_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [id, req.user.id]
  );
  res.json(await loadReport(id, req.user.id));
});

// ---------- Muallif tahriri (faqat "yangi" holatda) ----------

router.patch('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const body = reportPatchSchema.parse(req.body);
  const { rows } = await query('SELECT user_id, status FROM reports WHERE id = $1', [id]);
  const r = rows[0];
  if (!r) throw new HttpError(404, 'not_found');
  if (String(r.user_id) !== String(req.user.id)) throw new HttpError(403, 'forbidden');
  if (r.status !== 'new') throw new HttpError(409, 'locked');

  const entries = Object.entries(body);
  const sets = entries.map(([k], i) => `${k} = $${i + 1}`);
  await query(
    `UPDATE reports SET ${sets.join(', ')}, updated_at = now() WHERE id = $${entries.length + 1}`,
    [...entries.map(([, v]) => v), id]
  );
  res.json(await loadReport(id, req.user.id));
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const { rows } = await query('SELECT user_id, status, photo_path FROM reports WHERE id = $1', [id]);
  const r = rows[0];
  if (!r) throw new HttpError(404, 'not_found');
  if (String(r.user_id) !== String(req.user.id)) throw new HttpError(403, 'forbidden');
  if (r.status !== 'new') throw new HttpError(409, 'locked');
  await query('DELETE FROM reports WHERE id = $1', [id]);
  await removeFile(r.photo_path);
  res.status(204).end();
});

// ---------- Moderatsiya ----------

router.patch('/:id/status', requireAuth, requireRole(...MODERATOR_ROLES), async (req, res) => {
  const id = parseId(req.params.id);
  const { status, note } = statusSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT status FROM reports WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw new HttpError(404, 'not_found');
    const oldStatus = rows[0].status;
    if (oldStatus === status) throw new HttpError(400, 'same_status');

    await client.query(
      `UPDATE reports
       SET status = $1, updated_at = now(),
           cleaned_at = CASE WHEN $1 = 'cleaned' THEN now() ELSE NULL END
       WHERE id = $2`,
      [status, id]
    );
    await client.query(
      `INSERT INTO report_events (report_id, old_status, new_status, note, actor_role)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, oldStatus, status, note, req.user.role]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  res.json(await loadReport(id, req.user.id));
});

export default router;
