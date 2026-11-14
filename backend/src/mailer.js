import { config } from './config.js';
import { HttpError } from './errors.js';

const SUBJECT = {
  register: 'EcoXarita: emailni tasdiqlash kodi',
  login: 'EcoXarita: kirish kodi',
};

// Resend HTTP API orqali yuboradi (SMTP portlari bepul rejada bloklanishi mumkin)
export async function sendMail(to, purpose, code) {
  const text =
    `Sizning kodingiz: ${code}\n\n` +
    `Kod 10 daqiqa amal qiladi. Agar bu so'rov sizdan bo'lmasa, xabarni e'tiborsiz qoldiring va parolingizni almashtiring.`;

  if (!config.resendApiKey) {
    if (config.isProd) throw new HttpError(502, 'mail_failed');
    // Faqat development'da: kodni konsolga chiqaramiz
    console.log(`[DEV] ${purpose} kodi (${to}): ${code}`);
    return;
  }

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.mailFrom, to: [to], subject: SUBJECT[purpose], text }),
    });
  } catch {
    throw new HttpError(502, 'mail_failed');
  }
  if (!res.ok) {
    console.error('Resend xatosi:', res.status, await res.text());
    throw new HttpError(502, 'mail_failed');
  }
}
