import { z } from 'zod';
import { SCHOOL_EVENT_TYPES } from '@/domain/planning/school-calendar';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const capacity = z.number().int().min(0).nullable().optional();

export const createCalendarEventSchema = z
  .object({
    type: z.enum(SCHOOL_EVENT_TYPES),
    title: z.string().nullable().optional(),
    startDate: isoDate,
    endDate: isoDate,
    capacityOverride: capacity,
    notes: z.string().nullable().optional(),
  })
  .refine((e) => e.startDate <= e.endDate, {
    message: 'startDate must not be after endDate',
    path: ['endDate'],
  });

export const updateCalendarEventSchema = z
  .object({
    type: z.enum(SCHOOL_EVENT_TYPES).optional(),
    title: z.string().nullable().optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    capacityOverride: capacity,
    notes: z.string().nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'at least one field must be provided',
  });
