import { expect, test } from '@playwright/test';

test('reminders shows real windows and adherence, and a window toggles', async ({ page }) => {
  await page.goto('/reminders');

  await expect(page.getByText('Your windows')).toBeVisible();
  await expect(page.getByText('After school')).toBeVisible();
  await expect(page.getByText('Adherence · last 7 days')).toBeVisible();

  // Scope to one named window so parallel tests adding windows don't shift positions.
  const card = page.locator('.rounded-2xl', { hasText: 'After school' }).first();
  const toggle = card.getByRole('switch', { name: 'Window enabled' });
  const before = (await toggle.getAttribute('aria-checked')) ?? 'true';
  await toggle.click();

  await expect(page).toHaveURL(/\/reminders$/);
  await expect(
    page.locator('.rounded-2xl', { hasText: 'After school' }).first().getByRole('switch', {
      name: 'Window enabled',
    }),
  ).not.toHaveAttribute('aria-checked', before);
});

test('adding a study window persists it', async ({ page }) => {
  await page.goto('/reminders');
  await page.getByText('Add a window').click();
  await page.selectOption('select[name="dayType"]', 'DAILY');
  await page.fill('input[name="startTime"]', '06:15');
  await page.fill('input[name="endTime"]', '07:00');
  await page.fill('input[name="label"]', 'E2E morning');
  await page.getByRole('button', { name: 'Add window' }).click();

  await expect(page).toHaveURL(/\/reminders$/);
  await expect(page.getByText('E2E morning').first()).toBeVisible();
});
