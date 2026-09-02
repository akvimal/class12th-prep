import { NextResponse } from 'next/server';
import { repositories } from '@/app-services/context';
import { listCurriculumVersions } from '@/app-services/curriculum';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versions = await listCurriculumVersions(repositories());
  return NextResponse.json({ versions });
}
