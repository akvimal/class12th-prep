import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { enrollSubjects, listSubjectEnrollments } from '@/app-services/plan';
import { enrollSubjectsSchema } from '@/app-services/plan-schemas';
import { parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enrollments = await listSubjectEnrollments(repositories(), id);
  return NextResponse.json({ enrollments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, enrollSubjectsSchema);
  if (!parsed.ok) return parsed.response;

  const enrollments = await enrollSubjects(repositories(), id, parsed.data.subjects);
  return NextResponse.json({ enrollments }, { status: 201 });
}
