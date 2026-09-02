import { expect, test } from '@playwright/test';

const UUID = '00000000-0000-0000-0000-000000000000';

test('study-sessions list 404s for an unknown academic year', async ({ request }) => {
  const res = await request.get(`/api/academic-years/${UUID}/study-sessions`);
  expect(res.status()).toBe(404);
});

test('recording a session with negative minutes is a 400', async ({ request }) => {
  const res = await request.post(`/api/academic-years/${UUID}/study-sessions`, {
    data: { type: 'LEARN', completion: 'YES', actualMinutes: -5 },
  });
  expect(res.status()).toBe(400);
});

test('an unknown session type in the filter is a 400', async ({ request }) => {
  const res = await request.get(`/api/academic-years/${UUID}/study-sessions?type=NAPPING`);
  expect(res.status()).toBe(400);
});
