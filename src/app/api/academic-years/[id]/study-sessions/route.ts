import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { listStudySessions, recordStudySession } from '@/app-services/session';
import { recordSessionSchema } from '@/app-services/session-schemas';
import type { StudySessionType } from '@/domain/progress/study-session';
import { STUDY_SESSION_TYPES } from '@/domain/progress/study-session';
import { domainErrorResponse, parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = new URL(request.url).searchParams;
  const from = q.get('from');
  const to = q.get('to');
  const type = q.get('type');

  if ((from && !isoDate.test(from)) || (to && !isoDate.test(to))) {
    return NextResponse.json({ error: 'from/to must be YYYY-MM-DD' }, { status: 400 });
  }
  if (type && !STUDY_SESSION_TYPES.includes(type as StudySessionType)) {
    return NextResponse.json({ error: `unknown session type "${type}"` }, { status: 400 });
  }

  const sessions = await listStudySessions(repositories(), id, {
    from: from ?? undefined,
    to: to ?? undefined,
    subjectId: q.get('subjectId') ?? undefined,
    chapterId: q.get('chapterId') ?? undefined,
    type: (type as StudySessionType | null) ?? undefined,
  });
  if (!sessions) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
  return NextResponse.json({ sessions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, recordSessionSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const session = await recordStudySession(repositories(), id, parsed.data);
    if (!session) return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
