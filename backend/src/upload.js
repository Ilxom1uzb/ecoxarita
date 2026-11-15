import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { config } from './config.js';
import { HttpError } from './errors.js';

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + MIME_EXT[file.mimetype]),
});

export const photoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    MIME_EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(415, 'unsupported_file')),
}).single('photo');

// MIME sarlavhasi soxta bo'lishi mumkin: fayl boshidagi magic bytes tekshiriladi
export async function verifyImage(filePath) {
  const fh = await fs.open(filePath, 'r');
  const buf = Buffer.alloc(12);
  await fh.read(buf, 0, 12, 0);
  await fh.close();
  const ok =
    (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
    (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP');
  if (!ok) {
    await removeFile(filePath);
    throw new HttpError(415, 'unsupported_file');
  }
}

export async function removeFile(file) {
  if (!file) return;
  const target = typeof file === 'string' ? file : file.path;
  if (!target) return;
  await fs.unlink(target).catch((e) => {
    if (e.code !== 'ENOENT') console.error('fayl o‘chirilmadi:', e);
  });
}
