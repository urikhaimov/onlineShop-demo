import { test, expect } from '@playwright/test';

test('homepage loads without crash', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);
  // Page renders something (not a blank/crash page)
  const body = await page
    .locator('body')
    .innerText()
    .catch(() => '');
  expect(body.length).toBeGreaterThan(0);
});
