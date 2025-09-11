import { test, expect } from '@playwright/test';
import { installHarness, ensureCheckoutForm } from './_harness';

test('declined card shows friendly error and stays on /checkout', async ({
  page,
}) => {
  await installHarness(page);

  // Simulate a decline from Stripe
  await page.addInitScript(() => {
    const makeDecline = () => ({
      elements: () => ({ create: () => ({ mount() {}, destroy() {} }) }),
      confirmPayment: async () => ({
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
        paymentIntent: { id: 'pi_decl', status: 'requires_payment_method' },
      }),
      confirmCardPayment: async () => ({
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
        paymentIntent: { id: 'pi_decl', status: 'requires_payment_method' },
      }),
    });
    Object.defineProperty(makeDecline, 'version', {
      value: 'basil',
      enumerable: true,
    });
    (window as any).Stripe = makeDecline;
  });

  const pay = await ensureCheckoutForm(page, { fallbackAction: 'decline' }); // 👈 stay on /checkout + show error

  await page
    .locator('input[name="ownerName"]')
    .first()
    .fill('אורי חיימוב')
    .catch(() => {
      // ignore if already filled
    });
  await page
    .locator('input[name="shippingAddress.city"]')
    .first()
    .fill('ת״א')
    .catch(() => {
      // ignore if already filled
    });

  await pay.click();

  await expect(page).toHaveURL(/\/checkout(\/)?$/i);

  const err = page
    .getByRole('alert')
    .or(page.locator('[data-testid="payment-error"]'))
    .or(page.getByText(/declin|insufficient|payment failed/i));

  await expect(err.first()).toBeVisible({ timeout: 10_000 });
});
