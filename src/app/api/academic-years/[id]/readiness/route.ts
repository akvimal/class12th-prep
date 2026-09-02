import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { getAcademicYearReadiness } from '@/app-services/readiness';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshots = await getAcademicYearReadiness(repositories(), id);
  if (!snapshots) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
  return NextResponse.json({ snapshots });
}
