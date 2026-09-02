import { getHealth } from '@/app-services';
import { repositories } from '@/app-services/context';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { status, checks } = await getHealth(repositories());

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        Class 12 Board Prep
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Service shell</h1>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        Bootstrap only — no product features yet. The specification lives in{' '}
        <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800">docs/</code> and
        the task breakdown in{' '}
        <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800">tasks/</code>.
      </p>

      <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-neutral-500">Overall</dt>
        <dd className="font-medium">{status}</dd>
        <dt className="text-neutral-500">App</dt>
        <dd>running</dd>
        <dt className="text-neutral-500">Database</dt>
        <dd>{checks.database ? 'connected' : 'unreachable'}</dd>
      </dl>

      <a
        className="text-sm font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400"
        href="/api/health"
      >
        /api/health
      </a>
    </main>
  );
}
