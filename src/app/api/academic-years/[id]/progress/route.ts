import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { getCurriculumProgress } from '@/app-services/progress';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCurriculumProgress(repositories(), id);
  if (!result) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
  return NextResponse.json(result);
}
