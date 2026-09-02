import { NextResponse } from 'next/server';
import { getHealth } from '@/app-services';
import { repositories } from '@/app-services/context';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { status, checks } = await getHealth(repositories());

  return NextResponse.json(
    {
      status,
      checks: { database: checks.database ? 'up' : 'down' },
      time: new Date().toISOString(),
    },
    { status: status === 'ok' ? 200 : 503 },
  );
}
