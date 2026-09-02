import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repositories } from '@/app-services/context';
import { addStudyWindow, listStudyWindows } from '@/app-services/study-windows';
import { STUDY_WINDOW_DAY_TYPES } from '@/domain/planning/study-window';
import { domainErrorResponse, parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const newWindowSchema = z.object({
  dayType: z.enum(STUDY_WINDOW_DAY_TYPES),
  startTime: hhmm,
  endTime: hhmm,
  label: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ windows: await listStudyWindows(repositories(), id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, newWindowSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const window = await addStudyWindow(repositories(), { academicYearId: id, ...parsed.data });
    return NextResponse.json(window, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
