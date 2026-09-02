import { expect, test } from '@playwright/test';

test('adding a test shows it on the Tests tab', async ({ page }) => {
  await page.goto('/tests/new');

  await page.selectOption('select[name="subjectKey"]', 'PHY');
  await page.selectOption('select[name="type"]', 'SCHOOL_UNIT_TEST');
  await page.fill('input[name="name"]', 'E2E Physics test');
  await page.fill('input[name="examDate"]', '2026-09-30');
  await page.fill('input[name="maxMarks"]', '25');
  await page.getByRole('checkbox', { name: 'Electrostatics' }).check();

  await page.getByRole('button', { name: 'Save test' }).click();

  await expect(page).toHaveURL(/\/tests$/);
  const card = page.locator('.rounded-2xl', { hasText: 'E2E Physics test' }).first();
  await expect(card).toContainText('Electrostatics');
  await expect(card).toContainText('30 Sept');
  await expect(card).toContainText('25 marks');
});
