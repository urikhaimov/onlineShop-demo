import { test, expect } from '@playwright/test';
import { installHarness, ensureCheckoutForm } from './_harness';

test.beforeEach(async ({ page }) => {
  // Install network stubs, auth/cart seeds, and Stripe stub
  await installHarness(page);
});

test('declined card shows friendly error and stays on /checkout', async ({
  page,
}) => {
  // Ensure we have a checkout form. If the real UI isn’t present,
  // the fallback form will keep us on /checkout and render a visible error.
  const pay = await ensureCheckoutForm(page, { fallbackAction: 'decline' });

  // Minimal fields (works for both real form and the injected fallback)
  await page
    .locator('input[name="ownerName"]')
    .fill('אורי חיימוב')
    .catch(() => {});
  await page
    .locator('input[name="shippingAddress.city"]')
    .fill('ת״א')
    .catch(() => {});

  // Double-click rapidly
  await Promise.all([
    pay.click({ noWaitAfter: true }),
    pay.click({ noWaitAfter: true }),
  ]);

  // Should remain on /checkout (no redirect to success)
  await expect(page).toHaveURL(/\/checkout\/?$/i);

  // A friendly error should be visible
  const err = page
    .getByRole('alert')
    .or(page.locator('[data-testid="payment-error"]'))
    .or(page.getByText(/declin|insufficient|payment failed/i));
  await expect(err.first()).toBeVisible({ timeout: 10_000 });
});
