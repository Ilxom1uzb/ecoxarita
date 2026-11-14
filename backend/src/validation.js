import { z } from 'zod';
import { WASTE_TYPES, UNITS, STATUSES, ROLES, MAX_VOLUME } from './constants.js';

const email = z.string().trim().toLowerCase().email().max(120);
const password = z.string().min(8, 'min_8').max(100);
const volume = z.coerce.number().positive().max(MAX_VOLUME);
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(100),
});

export const reportSchema = z.object({
  waste_type: z.enum(WASTE_TYPES),
  volume_value: volume,
  volume_unit: z.enum(UNITS),
  lat,
  lng,
  address: z.string().trim().max(200).default(''),
  description: z.string().trim().max(500).default(''),
});

export const reportPatchSchema = z
  .object({
    volume_value: volume.optional(),
    volume_unit: z.enum(UNITS).optional(),
    address: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'empty');

export const statusSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().trim().max(300).default(''),
});

export const roleSchema = z.object({ role: z.enum(ROLES) });

export const listQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/).optional(),
  type: z.enum(WASTE_TYPES).optional(),
  status: z.enum(STATUSES).optional(),
  onlyOpen: z.enum(['1', '0']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
