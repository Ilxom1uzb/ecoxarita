import { config } from './config.js';
import { HttpError } from './errors.js';

const SUBJECT = {
  register: 'EcoXarita: emailni tasdiqlash kodi',
  login: 'EcoXarita: kirish kodi',
};

// Brevo (sobiq Sendinblue) HTTP API orqali yuboradi.
// Domen shart emas: yuboruvchi sifatida Brevo'da tasdiqlangan email yetarli.
export async function sendMail(to, purpose, code) {
  const text =
    `Sizning kodingiz: ${code}\n\n` +
    `Kod 10 daqiqa amal qiladi. Agar bu so'rov sizdan bo'lmasa, xabarni e'tiborsiz qoldiring.`;

  if (!config.brevoApiKey) {
    if (config.isProd) throw new HttpError(502, 'mail_failed');
    // Faqat development'da: kodni konsolga chiqaramiz
    console.log(`[DEV] ${purpose} kodi (${to}): ${code}`);
    return;
  }

  let res;
  try {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.brevoApiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: config.mailFromName, email: config.mailFromEmail },
        to: [{ email: to }],
        subject: SUBJECT[purpose],
        textContent: text,
      }),
    });
  } catch {
    throw new HttpError(502, 'mail_failed');
  }
  if (!res.ok) {
    console.error('Brevo xatosi:', res.status, await res.text());
    throw new HttpError(502, 'mail_failed');
  }
}
