import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { setChapterProgress } from '@/app-services/progress';
import { chapterProgressPatchSchema } from '@/app-services/progress-schemas';
import { domainErrorResponse, parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> },
) {
  const { id, chapterId } = await params;
  const parsed = await parseJson(request, chapterProgressPatchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const progress = await setChapterProgress(repositories(), id, chapterId, parsed.data);
    return NextResponse.json(progress);
  } catch (err) {
    return domainErrorResponse(err);
  }
}
