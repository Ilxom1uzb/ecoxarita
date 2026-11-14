import multer from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../errors.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, ...err.extra });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'file_too_large' : 'bad_request' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_request' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'file_too_large' });
  if (err.code === '23505') return res.status(409).json({ error: 'conflict' });

  console.error(err);
  return res.status(500).json({ error: 'server' });
}
