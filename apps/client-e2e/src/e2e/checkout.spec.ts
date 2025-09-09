import { test, expect } from '@playwright/test';

test('happy path checkout', async ({ page }) => {
  // Login helper or do UI login:
  await page.goto('http://localhost:5173');
  await page.click('text=Login');
  await page.fill('input[type=email]', 'user@test.com');
  await page.fill('input[type=password]', 'password123');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/');

  // Add products
  await page.click('data-test=product-card >> nth=0');
  await page.click('button:has-text("Add to cart")');
  await page.goto('/cart');
  await page.click('button:has-text("Checkout")');

  // Shipping form
  await page.fill('input[name="fullName"]', 'אורי חיימוב');
  await page.fill('input[name="address"]', 'רחוב הרצל 10');
  await page.fill('input[name="city"]', 'רמת גן');
  await page.fill('input[name="zip"]', '5251234');
  await page.fill('input[name="phone"]', '0501234567');

  // Stripe iframe
  const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
  await frame.locator('input[name="cardnumber"]').fill('4242 4242 4242 4242');
  await frame.locator('input[name="exp-date"]').fill('12 / 34');
  await frame.locator('input[name="cvc"]').fill('123');

  // Pay
  await page.click('button:has-text("Pay")');
  await expect(page.getByText(/payment|success|order/i)).toBeVisible({
    timeout: 20_000,
  });

  // Optional: assert order id visible and cart cleared
  await expect(page.locator('[data-test=cart-count]')).toHaveText('0');
});
