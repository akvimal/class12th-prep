import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { recalculateAcademicYearReadiness } from '@/app-services/readiness';

export const dynamic = 'force-dynamic';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const date = new URL(request.url).searchParams.get('date');
  if (date && !isoDate.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  const summary = await recalculateAcademicYearReadiness(repositories(), id, {
    asOf: date ?? undefined,
  });
  if (!summary) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
  return NextResponse.json(summary);
}
