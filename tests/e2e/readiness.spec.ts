import { expect, test } from '@playwright/test';

const UUID = '00000000-0000-0000-0000-000000000000';

test('readiness list 404s for an unknown academic year', async ({ request }) => {
  const res = await request.get(`/api/academic-years/${UUID}/readiness`);
  expect(res.status()).toBe(404);
});

test('recalculate 404s for an unknown academic year', async ({ request }) => {
  const res = await request.post(`/api/academic-years/${UUID}/readiness/recalculate`);
  expect(res.status()).toBe(404);
});

test('recalculate with a malformed date is a 400', async ({ request }) => {
  const res = await request.post(`/api/academic-years/${UUID}/readiness/recalculate?date=2026`);
  expect(res.status()).toBe(400);
});
