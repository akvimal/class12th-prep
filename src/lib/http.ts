import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { PlanDateOrderError } from '@/domain/planning/plan-dates';
import { WeightProvenanceError } from '@/domain/curriculum/provenance';

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/** Parse and validate a JSON request body. On failure, returns a 400 response with field errors. */
export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'validation failed',
          fields: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}

/**
 * Turn a known domain validation error into a 400. Anything else re-throws so
 * the framework returns 500 (a genuine server fault).
 */
export function domainErrorResponse(err: unknown): NextResponse {
  if (err instanceof PlanDateOrderError) {
    return NextResponse.json({ error: err.message, violations: err.violations }, { status: 400 });
  }
  if (err instanceof WeightProvenanceError) {
    return NextResponse.json({ error: err.message, violations: err.violations }, { status: 400 });
  }
  throw err;
}
