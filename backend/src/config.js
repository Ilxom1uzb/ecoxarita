import 'dotenv/config';
import path from 'node:path';

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const secret = env.JWT_SECRET || '';

if (isProd && secret.length < 32) {
  throw new Error('JWT_SECRET production muhitida kamida 32 belgi bo\'lishi kerak');
}
if (!isProd && secret.length < 32) {
  console.warn('[config] JWT_SECRET zaif yoki yo\'q. Development uchun vaqtinchalik qiymat ishlatiladi.');
}

export const config = {
  port: Number(env.PORT || 4000),
  isProd,
  databaseUrl: env.DATABASE_URL || 'postgres://ecoxarita:ecoxarita@localhost:5432/ecoxarita',
  jwtSecret: secret.length >= 32 ? secret : 'dev-only-insecure-secret-do-not-use-in-production-0123',
  corsOrigins: (env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.resolve(env.UPLOAD_DIR || './uploads'),
  adminEmail: env.ADMIN_EMAIL || '',
  adminPassword: env.ADMIN_PASSWORD || '',
  brevoApiKey: env.BREVO_API_KEY || '',
  mailFromEmail: env.MAIL_FROM_EMAIL || '',
  mailFromName: env.MAIL_FROM_NAME || 'EcoXarita',
};
