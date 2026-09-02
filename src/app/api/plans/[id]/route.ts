import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { getPlanOverview, updatePreparationPlan } from '@/app-services/plan';
import { updatePlanSchema } from '@/app-services/plan-schemas';
import { domainErrorResponse, parseJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const date = new URL(request.url).searchParams.get('date') ?? undefined;
  const overview = await getPlanOverview(repositories(), id, date);
  if (!overview) return NextResponse.json({ error: 'plan not found' }, { status: 404 });
  return NextResponse.json(overview);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, updatePlanSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const overview = await updatePreparationPlan(repositories(), id, parsed.data);
    if (!overview) return NextResponse.json({ error: 'plan not found' }, { status: 404 });
    return NextResponse.json(overview);
  } catch (err) {
    return domainErrorResponse(err);
  }
}
