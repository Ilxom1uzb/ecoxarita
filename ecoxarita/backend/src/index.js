import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import { config } from './config.js';
import { pool } from './db.js';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // reverse proxy (nginx, Render, Railway) ortida IP to'g'ri aniqlanadi

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigins, credentials: false }));
app.use(express.json({ limit: '100kb' }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'rate_limited' },
  })
);

app.use(
  '/uploads',
  express.static(config.uploadDir, { index: false, dotfiles: 'deny', maxAge: '7d' })
);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`EcoXarita API: http://localhost:${config.port}`);
});
