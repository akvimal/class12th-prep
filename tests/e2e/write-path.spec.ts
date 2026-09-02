import { expect, test } from '@playwright/test';

// These run against APP_DATA_SOURCE=memory — mutations persist for the lifetime
// of the one `pnpm start` server the run shares.

test('logging a study session shows up on the chapter and moves it off Today', async ({ page }) => {
  await page.goto('/subjects/PHY/PHY03');
  await expect(page.getByText('Readiness components')).toBeVisible();

  await page.getByRole('link', { name: 'Log study' }).click();
  await expect(page).toHaveURL(/\/session\?/);

  await page.selectOption('select[name="type"]', 'ACTIVE_RECALL');
  await page.fill('input[name="actualMinutes"]', '25');
  await page.getByRole('button', { name: 'Save session' }).click();

  await expect(page).toHaveURL(/\/subjects\/PHY\/PHY03$/);
  await expect(page.getByText('Recent activity')).toBeVisible();
  await expect(page.getByText(/Active Recall · 25 min/)).toBeVisible();
});

test('updating chapter ratings recomputes readiness', async ({ page }) => {
  await page.goto('/subjects/MAT/MAT02');

  await page.getByText('Update my ratings').click();
  await page.selectOption('select[name="schoolStatus"]', 'COMPLETED');
  await page.fill('input[name="conceptScore"]', '85');
  await page.fill('input[name="testScore"]', '80');
  await page.getByRole('button', { name: 'Save & recompute readiness' }).click();

  await expect(page).toHaveURL(/\/subjects\/MAT\/MAT02$/);
  // the concept component row shows the score we saved
  await expect(page.getByText(/85 ·\s*20%/)).toBeVisible();
  // the ratings form re-opens prefilled with the saved values
  await page.getByText('Update my ratings').click();
  await expect(page.locator('select[name="schoolStatus"]')).toHaveValue('COMPLETED');
  await expect(page.locator('input[name="testScore"]')).toHaveValue('80');
});

test('Today "Done" records a session and refreshes the queue', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByText(/Primary ·/)).toBeVisible();

  const firstDone = page.getByRole('button', { name: /Mark .* done/ }).first();
  await firstDone.click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByText(/Primary ·/)).toBeVisible();
});
