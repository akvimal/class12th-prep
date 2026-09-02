import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { getCurriculumHierarchy } from '@/app-services/curriculum';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCurriculumHierarchy(repositories(), id);
  if (!result) {
    return NextResponse.json({ error: 'curriculum version not found' }, { status: 404 });
  }
  return NextResponse.json(result);
}
