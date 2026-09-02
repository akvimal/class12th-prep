import { expect, test } from '@playwright/test';

const UUID = '00000000-0000-0000-0000-000000000000';

test('plan endpoint 404s for an unknown plan', async ({ request }) => {
  const res = await request.get(`/api/plans/${UUID}`);
  expect(res.status()).toBe(404);
});

test('creating a plan with an out-of-order date set is a 400 with field errors', async ({
  request,
}) => {
  const res = await request.post(`/api/academic-years/${UUID}/plans`, {
    data: {
      startDate: '2026-09-02',
      syllabusTargetDate: 'not-a-date',
      hardCompletionDate: '2026-12-31',
      revisionStartDate: '2027-01-01',
      examWindowStart: '2027-02-01',
      examWindowEnd: '2027-03-31',
      weekdayCapacityMinutes: 120,
      weekendCapacityMinutes: 240,
    },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toBe('validation failed');
  expect(Array.isArray(body.fields)).toBe(true);
});

test('subject enrollments endpoint returns a list', async ({ request }) => {
  const res = await request.get(`/api/academic-years/${UUID}/subjects`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.enrollments)).toBe(true);
});
