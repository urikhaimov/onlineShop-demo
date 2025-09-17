// apps/client-e2e/src/e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout a11y: no serious violations', async ({ page }) => {
  // seed "logged-in" state before the app loads
  await page.addInitScript(() => {
    try {
      const token = 'e2e-token';
      localStorage.setItem('token', token);
      localStorage.setItem('roles', JSON.stringify(['admin']));
      localStorage.setItem(
        'auth',
        JSON.stringify({
          token,
          isAuthenticated: true,
          user: { id: 'u_test', email: 'test@example.com', roles: ['admin'] },
        }),
      );
      document.cookie = `Authorization=Bearer ${token}; path=/; samesite=lax`;
    } catch {}
  });

  // (optional) stub a common "who am I" endpoint if your app calls it during render
  await page.route(
    (url) => {
      try {
        const p = new URL(url).pathname;
        return /^\/api\/(auth\/me|me|session|sessions|whoami)\/?$/.test(p);
      } catch {
        return false;
      }
    },
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          id: 'u_test',
          email: 'test@example.com',
          roles: ['admin'],
          name: 'Test User',
        }),
      }),
  );

  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('#toast-root') // ignore transient toasts
    .analyze();

  const serious = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact as any),
  );
  expect(serious).toHaveLength(0);
});
