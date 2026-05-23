import { test, expect } from '@playwright/test';
import { installHarness, ensureCheckoutForm } from './_harness';

test('declined payment shows friendly error and stays on /checkout', async ({
  page,
}) => {
  await installHarness(page);

  // Override the capture endpoint to simulate a PayPal decline
  await page.route(
    (url) => {
      try {
        return /\/capture-?paypal-?order/i.test(new URL(url).pathname);
      } catch {
        return false;
      }
    },
    (route) =>
      route.fulfill({
        status: 422,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          message: 'Payment declined by PayPal.',
          statusCode: 422,
        }),
      }),
  );

  const pay = await ensureCheckoutForm(page, { fallbackAction: 'decline' });

  await page
    .locator('input[name="ownerName"]')
    .first()
    .fill('אורי חיימוב')
    .catch(() => {
      // ignore
    });
  await page
    .locator('input[name="shippingAddress.city"]')
    .first()
    .fill('ת״א')
    .catch(() => {
      // ignore
    });

  await pay.click();

  await expect(page).toHaveURL(/\/checkout(\/)?$/i);

  const err = page
    .getByRole('alert')
    .or(page.locator('[data-testid="payment-error"]'))
    .or(page.getByText(/declin|insufficient|payment failed/i));

  await expect(err.first()).toBeVisible({ timeout: 10_000 });
});
