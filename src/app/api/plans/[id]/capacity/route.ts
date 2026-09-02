import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { getCapacityRange, getDailyCapacity } from '@/app-services/calendar';

export const dynamic = 'force-dynamic';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/plans/{id}/capacity            -> capacity for the whole plan window
 * GET /api/plans/{id}/capacity?date=...    -> capacity for one day
 * GET /api/plans/{id}/capacity?from=&to=   -> capacity for a range
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  for (const value of [date, from, to]) {
    if (value && !isoDate.test(value)) {
      return NextResponse.json({ error: 'dates must be YYYY-MM-DD' }, { status: 400 });
    }
  }

  if (date) {
    const day = await getDailyCapacity(repositories(), id, date);
    if (!day) return NextResponse.json({ error: 'plan not found' }, { status: 404 });
    return NextResponse.json(day);
  }

  const range = await getCapacityRange(repositories(), id, from ?? undefined, to ?? undefined);
  if (!range) return NextResponse.json({ error: 'plan not found' }, { status: 404 });
  return NextResponse.json(range);
}
