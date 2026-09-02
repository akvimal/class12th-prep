import { NextResponse } from 'next/server';
import { addCalendarEvent, listCalendarEvents } from '@/app-services/calendar';
import { createCalendarEventSchema } from '@/app-services/calendar-schemas';
import { repositories } from '@/app-services/context';
import { parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if ((from && !isoDate.test(from)) || (to && !isoDate.test(to))) {
    return NextResponse.json({ error: 'from/to must be YYYY-MM-DD' }, { status: 400 });
  }

  const events = await listCalendarEvents(repositories(), id, {
    from: from ?? undefined,
    to: to ?? undefined,
  });
  return NextResponse.json({ events });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: academicYearId } = await params;
  const parsed = await parseJson(request, createCalendarEventSchema);
  if (!parsed.ok) return parsed.response;

  const created = await addCalendarEvent(repositories(), { academicYearId, ...parsed.data });
  return NextResponse.json(created, { status: 201 });
}
