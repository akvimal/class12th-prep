import { expect, test } from '@playwright/test';

const UUID = '00000000-0000-0000-0000-000000000000';

test('progress endpoint 404s for an unknown academic year', async ({ request }) => {
  const res = await request.get(`/api/academic-years/${UUID}/progress`);
  expect(res.status()).toBe(404);
});

test('setting a chapter score out of range is a 400', async ({ request }) => {
  const res = await request.put(`/api/academic-years/${UUID}/chapters/${UUID}/progress`, {
    data: { conceptScore: 250 },
  });
  expect(res.status()).toBe(400);
});

test('an empty progress patch is a 400', async ({ request }) => {
  const res = await request.put(`/api/academic-years/${UUID}/chapters/${UUID}/progress`, {
    data: {},
  });
  expect(res.status()).toBe(400);
});
