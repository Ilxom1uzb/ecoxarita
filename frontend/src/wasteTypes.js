// Backend constants.js bilan bir xil bo'lishi kerak
export const WASTE_TYPES = [
  { id: 'plastic', color: '#3B82F6', label: { uz: 'Plastik', ru: 'Пластик', en: 'Plastic' } },
  { id: 'glass', color: '#06B6D4', label: { uz: 'Shisha', ru: 'Стекло', en: 'Glass' } },
  { id: 'paper', color: '#F59E0B', label: { uz: "Qog'oz", ru: 'Бумага', en: 'Paper' } },
  { id: 'metal', color: '#64748B', label: { uz: 'Metall', ru: 'Металл', en: 'Metal' } },
  { id: 'organic', color: '#84CC16', label: { uz: 'Organik', ru: 'Органика', en: 'Organic' } },
  { id: 'ewaste', color: '#A855F7', label: { uz: 'Elektron chiqindi', ru: 'Электронные отходы', en: 'E-waste' } },
  { id: 'construction', color: '#78716C', label: { uz: 'Qurilish chiqindisi', ru: 'Строительный мусор', en: 'Construction debris' } },
  { id: 'hazardous', color: '#EF4444', label: { uz: 'Xavfli', ru: 'Опасные', en: 'Hazardous' } },
  { id: 'mixed', color: '#9CA3AF', label: { uz: 'Aralash', ru: 'Смешанные', en: 'Mixed' } },
];

export const UNITS = [
  { id: 'm3', label: { uz: 'm³', ru: 'м³', en: 'm³' } },
  { id: 'kg', label: { uz: 'kg', ru: 'кг', en: 'kg' } },
  { id: 'ton', label: { uz: 'tonna', ru: 'тонна', en: 'ton' } },
  { id: 'bag', label: { uz: 'qop', ru: 'мешок', en: 'bag' } },
  { id: 'piece', label: { uz: 'dona', ru: 'шт', en: 'pc' } },
];

export const ROLES = ['user', 'moderator', 'admin'];
export const STATUS_IDS = ['new', 'in_progress', 'cleaned', 'hidden'];

export const wasteLabel = (id, lang) => WASTE_TYPES.find((w) => w.id === id)?.label[lang] ?? id;
export const wasteColor = (id) => WASTE_TYPES.find((w) => w.id === id)?.color ?? '#9CA3AF';
export const unitLabel = (id, lang) => UNITS.find((u) => u.id === id)?.label[lang] ?? id;
