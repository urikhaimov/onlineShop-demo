import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout a11y: no serious violations', async ({ page }) => {
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('#toast-root') // ignore ephemeral overlays if you have them
    .analyze();

  const serious = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact as any),
  );
  expect(serious).toHaveLength(0);
});
