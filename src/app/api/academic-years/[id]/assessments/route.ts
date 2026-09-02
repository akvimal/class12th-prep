import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { addAssessment, listUpcomingAssessments } from '@/app-services/assessment';
import { addAssessmentSchema } from '@/app-services/assessment-schemas';
import { domainErrorResponse, parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asOf =
    new URL(request.url).searchParams.get('asOf') ?? new Date().toISOString().slice(0, 10);
  if (!isoDate.test(asOf)) {
    return NextResponse.json({ error: 'asOf must be YYYY-MM-DD' }, { status: 400 });
  }
  const assessments = await listUpcomingAssessments(repositories(), id, asOf);
  return NextResponse.json({ assessments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, addAssessmentSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const assessment = await addAssessment(repositories(), id, parsed.data);
    if (!assessment)
      return NextResponse.json({ error: 'academic year not found' }, { status: 404 });
    return NextResponse.json(assessment, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
