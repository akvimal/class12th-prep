import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { createPreparationPlan } from '@/app-services/plan';
import { createPlanSchema } from '@/app-services/plan-schemas';
import { domainErrorResponse, parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: academicYearId } = await params;
  const parsed = await parseJson(request, createPlanSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const overview = await createPreparationPlan(repositories(), academicYearId, parsed.data);
    return NextResponse.json(overview, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
