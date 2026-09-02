import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { detectDailyEvents, listEvents } from '@/app-services/events';
import { DELIVERY_STATUSES, DOMAIN_EVENT_TYPES } from '@/domain/events/events';
import type { DeliveryStatus, DomainEventType } from '@/domain/events/events';

export const dynamic = 'force-dynamic';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = new URL(request.url).searchParams;
  const eventType = q.get('type');
  const deliveryStatus = q.get('delivery');

  if (eventType && !DOMAIN_EVENT_TYPES.includes(eventType as DomainEventType)) {
    return NextResponse.json({ error: `unknown event type "${eventType}"` }, { status: 400 });
  }
  if (deliveryStatus && !DELIVERY_STATUSES.includes(deliveryStatus as DeliveryStatus)) {
    return NextResponse.json({ error: `unknown delivery status` }, { status: 400 });
  }

  const events = await listEvents(repositories(), id, {
    eventType: (eventType as DomainEventType | null) ?? undefined,
    deliveryStatus: (deliveryStatus as DeliveryStatus | null) ?? undefined,
  });
  if (!events) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
  return NextResponse.json({ events });
}

/** Trigger event generation for a day (idempotent). Normally a worker job. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asOf =
    new URL(request.url).searchParams.get('asOf') ?? new Date().toISOString().slice(0, 10);
  if (!isoDate.test(asOf)) {
    return NextResponse.json({ error: 'asOf must be YYYY-MM-DD' }, { status: 400 });
  }
  const result = await detectDailyEvents(repositories(), id, asOf);
  if (!result) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
  return NextResponse.json(result);
}
