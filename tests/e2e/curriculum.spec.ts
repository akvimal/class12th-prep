import { expect, test } from '@playwright/test';

test('curriculum-versions endpoint returns a list', async ({ request }) => {
  const res = await request.get('/api/curriculum-versions');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.versions)).toBe(true);
});

test('hierarchy endpoint 404s for an unknown version', async ({ request }) => {
  const res = await request.get(
    '/api/curriculum-versions/00000000-0000-0000-0000-000000000000/hierarchy',
  );
  expect(res.status()).toBe(404);
});
