import { expect, test } from '@playwright/test';

test('Study Now recommends one task with a timed micro-plan', async ({ page }) => {
  await page.goto('/study-now');

  await expect(page.getByRole('heading', { name: 'Study Now' })).toBeVisible();
  await expect(page.getByText('Recommended')).toBeVisible();
  await expect(page.getByText('Why this?')).toBeVisible();

  const start = page.getByRole('link', { name: 'Start this task' });
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute('href', /\/session\?chapter=/);

  // pick a shorter time and confirm the recommendation still renders
  await page.getByRole('link', { name: '30', exact: true }).click();
  await expect(page).toHaveURL(/\/study-now\?mins=30/);
  await expect(page.getByText('Recommended')).toBeVisible();
});
