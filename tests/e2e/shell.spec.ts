import { expect, test } from '@playwright/test';

test('dashboard renders wired synthetic data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Overall readiness')).toBeVisible();
  await expect(page.getByText('On track', { exact: true })).toBeVisible();
  await expect(page.getByText('Syllabus target')).toBeVisible();
});

test('bottom nav moves between the primary tabs', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Subjects' }).click();
  await expect(page).toHaveURL(/\/subjects$/);
  await expect(page.getByRole('heading', { name: 'Subjects' })).toBeVisible();

  await page.getByRole('link', { name: 'Tests' }).click();
  await expect(page).toHaveURL(/\/tests$/);
  await expect(page.getByRole('heading', { name: 'Tests' })).toBeVisible();

  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('daily loop: today → chapter detail → session form', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByText(/Primary ·/)).toBeVisible();

  await page.getByRole('link', { name: 'Why this?' }).first().click();
  await expect(page).toHaveURL(/\/subjects\/[A-Z]+\/[A-Z0-9]+$/);
  await expect(page.getByText('Readiness components')).toBeVisible();

  await page.getByRole('link', { name: 'Log study' }).click();
  await expect(page).toHaveURL(/\/session\?/);
  await expect(page.getByRole('button', { name: 'Save session' })).toBeVisible();
});

test('subjects tab drills into a subject chapter list', async ({ page }) => {
  await page.goto('/subjects');
  await page.getByRole('link', { name: 'Open chapters' }).first().click();
  await expect(page).toHaveURL(/\/subjects\/[A-Z]+$/);
});

test('more menu reaches the planning and trajectory screens', async ({ page }) => {
  await page.goto('/more');
  await page.getByRole('link', { name: 'Impact on your goal' }).click();
  await expect(page).toHaveURL(/\/trajectory$/);
  await expect(page.getByText('Projected board score')).toBeVisible();

  await page.goto('/more');
  await page.getByRole('link', { name: 'Plan & dates' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByText('Milestones')).toBeVisible();
});
