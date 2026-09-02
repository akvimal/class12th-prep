import { expect, test } from '@playwright/test';

const UUID = '00000000-0000-0000-0000-000000000000';

test('calendar-events list endpoint returns an array', async ({ request }) => {
  const res = await request.get(`/api/academic-years/${UUID}/calendar-events`);
  expect(res.status()).toBe(200);
  expect(Array.isArray((await res.json()).events)).toBe(true);
});

test('creating a calendar event with an unknown type is a 400', async ({ request }) => {
  const res = await request.post(`/api/academic-years/${UUID}/calendar-events`, {
    data: { type: 'SNOW_DAY', startDate: '2026-11-10', endDate: '2026-11-10' },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('validation failed');
});

test('plan capacity endpoint 404s for an unknown plan', async ({ request }) => {
  const res = await request.get(`/api/plans/${UUID}/capacity?date=2026-09-02`);
  expect(res.status()).toBe(404);
});
