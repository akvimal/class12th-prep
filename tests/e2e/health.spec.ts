import { expect, test } from '@playwright/test';

test('service shell page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Service shell' })).toBeVisible();
  await expect(page.getByText('running')).toBeVisible();
});

test('health endpoint responds with a status body', async ({ request }) => {
  const res = await request.get('/api/health');
  expect([200, 503]).toContain(res.status());

  const body = await res.json();
  expect(body.status).toMatch(/^(ok|degraded)$/);
  expect(body.checks).toHaveProperty('database');
  expect(typeof body.time).toBe('string');
});
