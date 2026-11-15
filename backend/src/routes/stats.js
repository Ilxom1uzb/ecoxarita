import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [totals, byType, volumes, byMonth, clean] = await Promise.all([
    query(`SELECT
             count(*) FILTER (WHERE status <> 'hidden')::int AS total,
             count(*) FILTER (WHERE status IN ('new','in_progress'))::int AS open,
             count(*) FILTER (WHERE status = 'cleaned')::int AS cleaned
           FROM reports`),
    query(`SELECT waste_type, count(*)::int AS n FROM reports WHERE status <> 'hidden' GROUP BY waste_type`),
    query(`SELECT volume_unit, sum(volume_value)::float AS total FROM reports
           WHERE status <> 'hidden' GROUP BY volume_unit`),
    query(`SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS m, count(*)::int AS n
           FROM reports
           WHERE status <> 'hidden' AND created_at >= (date_trunc('month', now() AT TIME ZONE 'UTC') - interval '11 months')
           GROUP BY m`),
    query(`SELECT avg(extract(epoch FROM (cleaned_at - created_at)) / 3600)::float AS hours
           FROM reports WHERE status = 'cleaned' AND cleaned_at IS NOT NULL`),
  ]);

  // Oxirgi 12 oy, yo'q oylar 0 bilan to'ldiriladi (UTC bo'yicha)
  const monthMap = Object.fromEntries(byMonth.rows.map((r) => [r.m, r.n]));
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const key = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
    months.push({ month: key, count: monthMap[key] || 0 });
  }

  res.json({
    totals: totals.rows[0],
    byType: Object.fromEntries(byType.rows.map((r) => [r.waste_type, r.n])),
    volumeByUnit: Object.fromEntries(volumes.rows.map((r) => [r.volume_unit, r.total])),
    byMonth: months,
    avgCleanHours: clean.rows[0].hours,
  });
});

export default router;
