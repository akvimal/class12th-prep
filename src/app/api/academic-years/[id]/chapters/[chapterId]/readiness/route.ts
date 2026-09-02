import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { getChapterReadiness } from '@/app-services/readiness';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> },
) {
  const { id, chapterId } = await params;
  const result = await getChapterReadiness(repositories(), id, chapterId);
  if (!result) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
  return NextResponse.json(result);
}
