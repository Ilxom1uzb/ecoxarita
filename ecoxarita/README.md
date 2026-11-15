# EcoXarita

Chiqindi hisobotlari xaritasi. Frontend: React + Vite + Leaflet. Backend: Node.js (Express 5) + PostgreSQL.
Keyingi bosqich: frontend'ni Capacitor orqali APK'ga o'rash.

## Tuzilma

```
ecoxarita/
├── docker-compose.yml      PostgreSQL 16
├── backend/
│   ├── schema.sql          jadvallar
│   ├── src/
│   │   ├── index.js        Express ilovasi (helmet, CORS, rate limit)
│   │   ├── config.js       .env o'qish va tekshirish
│   │   ├── migrate.js      schema.sql ni bajaradi
│   │   ├── seed.js         birinchi admin foydalanuvchini yaratadi
│   │   ├── validation.js   zod sxemalari (barcha kirish ma'lumotlari shu yerda)
│   │   ├── upload.js       rasm yuklash + magic bytes tekshiruvi
│   │   ├── middleware/     auth (JWT + rol), xatolarni boshqarish
│   │   └── routes/         auth, reports, stats, admin
└── frontend/
    └── src/
        ├── App.jsx         tab navigatsiya, sessiya
        ├── api.js          API klienti
        ├── i18n.js         uz / ru / en
        ├── context.jsx     til va bildirishnoma
        └── components/     xarita, ro'yxat, sheetlar, statistika, moderatsiya
```

## Ishga tushirish

Talablar: Node.js 20+, Docker (yoki PostgreSQL 16).

```bash
# 1. Baza
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # JWT_SECRET va ADMIN_* qiymatlarini o'zgartiring
npm install
npm run migrate
npm run seed                  # ADMIN_EMAIL / ADMIN_PASSWORD bilan admin yaratadi
npm run dev                   # http://localhost:4000

# 3. Frontend (yangi terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

## API qisqacha

| Metod | Yo'l | Kim | Vazifa |
|---|---|---|---|
| POST | /api/auth/register | hamma | ro'yxatdan o'tish |
| POST | /api/auth/login | hamma | kirish (JWT) |
| GET | /api/auth/me | login | joriy foydalanuvchi |
| DELETE | /api/auth/me | login | akkauntni o'chirish (anonimlashtirish) |
| GET | /api/reports?bbox=&type=&status=&onlyOpen=1&page=&limit= | login | ro'yxat / xarita |
| GET | /api/reports/mine | login | o'z hisobotlari |
| GET | /api/reports/:id | login | bitta hisobot |
| GET | /api/reports/:id/events | login | holat tarixi |
| POST | /api/reports | login | yaratish (multipart, `photo` ixtiyoriy) |
| POST | /api/reports/:id/confirm | login | tasdiqlash (dublikatda) |
| PATCH | /api/reports/:id | muallif | tahrirlash (faqat "yangi" holatda) |
| DELETE | /api/reports/:id | muallif | o'chirish (faqat "yangi" holatda) |
| PATCH | /api/reports/:id/status | moderator, admin | holatni o'zgartirish + izoh |
| GET | /api/stats | hamma | umumiy statistika |
| GET | /api/admin/users | admin | foydalanuvchilar |
| PATCH | /api/admin/users/:id/role | admin | rolni o'zgartirish |

Dublikat: bir xil turdagi chiqindi 30 m ichida bo'lsa, `POST /api/reports` 409 `duplicate` qaytaradi va mavjud hisobotni ko'rsatadi.

## Xavfsizlik

- Parollar bcrypt (cost 12) bilan hash qilinadi, ochiq matn saqlanmaydi.
- Rol har so'rovda bazadan o'qiladi. Klient tomonidagi rol ishonchli emas.
- Barcha kirish ma'lumotlari zod bilan tekshiriladi. Muallif ma'lumotlari (ism, email) ochiq API'da chiqarilmaydi.
- Rasm hajmi 5 MB, faqat JPEG/PNG/WebP, fayl boshidagi belgilar bo'yicha tekshiriladi.
- Helmet, CORS ro'yxati, umumiy va auth uchun rate limit.
- Frontend `innerHTML` ishlatmaydi (React escape qiladi), XSS xavfi yo'q.

## Ma'lum cheklovlar (keyingi bosqichlar)

- Manzil avtomatik olinmaydi (reverse geocoding). Hozircha qo'lda kiritiladi.
- Rasmlar mahalliy `uploads/` papkada. Ishlab chiqarishda S3 yoki boshqa obyekt xotirasi tavsiya etiladi.
- Parolni tiklash (email) va push-bildirishnomalar hali yo'q.
- Marker clustering yo'q: xarita faqat ko'rinib turgan hududdagi 300 tagacha hisobotni yuklaydi.
- OSM ommaviy tile serveri ishlab chiqarish uchun mo'ljallanmagan, `VITE_TILE_URL` orqali o'z xizmatingizni ulang.
- Testlar yozilmagan. Keyingi qadam: API uchun integratsion testlar.

## Production uchun

- `NODE_ENV=production` va 32+ belgili `JWT_SECRET` majburiy (aks holda server ishga tushmaydi).
- Backend HTTPS orqasida (reverse proxy) ishlatilishi kerak.
- `CORS_ORIGIN` ga aniq frontend domenini yozing.
