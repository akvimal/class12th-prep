import { NextResponse } from 'next/server';
import { deleteCalendarEvent, updateCalendarEvent } from '@/app-services/calendar';
import { updateCalendarEventSchema } from '@/app-services/calendar-schemas';
import { repositories } from '@/app-services/context';
import { parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, updateCalendarEventSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return NextResponse.json(await updateCalendarEvent(repositories(), id, parsed.data));
  } catch {
    return NextResponse.json({ error: 'calendar event not found' }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteCalendarEvent(repositories(), id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'calendar event not found' }, { status: 404 });
  }
}
