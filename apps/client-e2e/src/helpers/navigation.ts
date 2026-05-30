// apps/client-e2e/src/helpers/navigation.ts
// Resilient navigation helpers that handle SPA redirect quirks.
import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Wait for the app shell to be present before returning
  try {
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  } catch {
    // networkidle can be slow with Firebase; don't fail on timeout
  }
}

export async function gotoAndWait(
  page: Page,
  path: string,
  selector: string,
  timeout = 20_000,
) {
  await goto(page, path);
  await page.waitForSelector(selector, { timeout });
}

/** Navigate to admin section. Retries once if redirected. */
export async function gotoAdmin(page: Page, subPath = '') {
  const fullPath = `/admin${subPath}`;
  await goto(page, fullPath);
  // If redirected away (e.g., auth check), try once more
  if (!page.url().includes('/admin')) {
    await goto(page, fullPath);
  }
}

/** Wait for a URL pattern */
export async function waitForUrl(
  page: Page,
  pattern: RegExp,
  timeout = 15_000,
) {
  await expect(page).toHaveURL(pattern, { timeout });
}

/** Click a button by text, handling disabled state gracefully */
export async function clickButton(
  page: Page,
  name: string | RegExp,
  timeout = 10_000,
): Promise<void> {
  const btn = page.getByRole('button', { name });
  await btn.waitFor({ state: 'visible', timeout });
  await btn.click();
}

/** Wait for toast/snackbar message */
export async function waitForToast(
  page: Page,
  pattern: string | RegExp,
  timeout = 8_000,
): Promise<Locator> {
  const toast = page
    .getByRole('alert')
    .filter({ hasText: pattern })
    .or(page.locator('[class*="notistack"]').filter({ hasText: pattern }))
    .or(page.locator('[class*="Snackbar"]').filter({ hasText: pattern }));
  await toast.first().waitFor({ state: 'visible', timeout });
  return toast.first();
}

/** Dismiss any open dialog/modal */
export async function dismissDialog(page: Page) {
  const cancelBtn = page.getByRole('button', { name: /cancel|close|dismiss/i });
  if (await cancelBtn.count()) {
    await cancelBtn.first().click();
  } else {
    await page.keyboard.press('Escape');
  }
}

/** Fill a MUI TextField by its label text */
export async function fillField(
  page: Page,
  label: string | RegExp,
  value: string,
) {
  const field = page.getByLabel(label);
  await field.waitFor({ state: 'visible', timeout: 5_000 });
  await field.fill(value);
}
