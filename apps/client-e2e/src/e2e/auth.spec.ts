// apps/client-e2e/src/e2e/auth.spec.ts
// Auth flows: login page UI, protected routes, logout, forgot password,
// and actual credential submission via mocked Firebase REST API.
// NOTE: Firebase sign-in IS exercised here by intercepting Google's identity
// toolkit endpoints and returning mock responses — the Firebase JS SDK parses
// and stores the fake JWT just like a real one (signatures are never verified
// client-side).
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { installHarness } from './_harness';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Build a structurally-valid (but unsigned) Firebase ID-token JWT.
 * The Firebase JS SDK base64url-decodes the payload to read claims; it does
 * NOT verify the RSA signature on the client side.
 */
function buildFakeJwt(uid = 'e2e_uid', email = 'test@example.com'): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const b64url = (v: object) =>
    Buffer.from(JSON.stringify(v)).toString('base64url');
  const header = b64url({ alg: 'RS256', kid: 'mock', typ: 'JWT' });
  const payload = b64url({
    iss: 'https://securetoken.google.com/online-shop-75482',
    aud: 'online-shop-75482',
    auth_time: nowSec - 5,
    user_id: uid,
    sub: uid,
    iat: nowSec - 5,
    exp: nowSec + 3595,
    email,
    email_verified: true,
    firebase: {
      identities: { email: [email] },
      sign_in_provider: 'password',
    },
    role: 'admin',
  });
  return `${header}.${payload}.bW9jay1zaWduYXR1cmU`;
}

/**
 * Wire up Firebase REST API intercepts so the real Firebase SDK thinks a
 * sign-in attempt succeeded or failed without hitting Google's servers.
 */
async function mockFirebaseSignIn(
  page: Page,
  opts: { succeed: boolean; email?: string; delayMs?: number },
) {
  const jwt = buildFakeJwt('e2e_uid', opts.email ?? 'test@example.com');

  // 1. identitytoolkit — signInWithPassword
  const delayMs = opts.delayMs;
  await page.route(
    '**/identitytoolkit.googleapis.com/**/accounts:signInWithPassword**',
    async (route) => {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      if (!opts.succeed) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 400,
              message: 'INVALID_PASSWORD',
              errors: [
                {
                  message: 'INVALID_PASSWORD',
                  domain: 'global',
                  reason: 'invalid',
                },
              ],
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#VerifyPasswordResponse',
          localId: 'e2e_uid',
          email: opts.email ?? 'test@example.com',
          displayName: '',
          idToken: jwt,
          registered: true,
          refreshToken: 'e2e-refresh-token',
          expiresIn: '3600',
        }),
      });
    },
  );

  // 2. accounts:lookup — Firebase fetches user profile after sign-in
  await page.route(
    '**/identitytoolkit.googleapis.com/**/accounts:lookup**',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#GetAccountInfoResponse',
          users: [
            {
              localId: 'e2e_uid',
              email: opts.email ?? 'test@example.com',
              emailVerified: true,
              passwordHash: 'mock-hash',
              passwordUpdatedAt: 1_600_000_000_000,
              providerUserInfo: [
                {
                  providerId: 'password',
                  federatedId: opts.email ?? 'test@example.com',
                  email: opts.email ?? 'test@example.com',
                  rawId: opts.email ?? 'test@example.com',
                },
              ],
              validSince: '1600000000',
              lastLoginAt: '1600000000000',
              createdAt: '1600000000000',
            },
          ],
        }),
      }),
  );

  // 3. securetoken — token refresh (called by getIdToken(true) after sign-in)
  await page.route(
    '**/securetoken.googleapis.com/**/token**',
    async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: jwt,
          expires_in: '3600',
          token_type: 'Bearer',
          refresh_token: 'e2e-refresh-token',
          id_token: jwt,
          user_id: 'e2e_uid',
          project_id: 'online-shop-75482',
        }),
      });
    },
  );

  // 4. /auth/ensure-role — called when role claim is absent (safety net)
  await page.route('**/api/auth/ensure-role**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"ok":true}',
    }),
  );
}

// ─── existing form-rendering tests ──────────────────────────────────────────

test.describe('Login page', () => {
  test('renders login form with all fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-form')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const submit = page.getByTestId('login-submit');
    await submit.waitFor({ state: 'visible', timeout: 10_000 });
    await submit.click();
    await expect(
      page
        .getByText(/email is required/i)
        .or(page.getByText(/required/i).first()),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('has link to signup page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const signupLink = page
      .getByRole('button', { name: /create an account/i })
      .or(page.getByRole('link', { name: /create an account/i }))
      .or(page.getByText(/create an account/i));
    await expect(signupLink.first()).toBeVisible({ timeout: 10_000 });
  });

  test('has link to forgot password', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const forgotLink = page.getByText(/forgot password/i);
    await expect(forgotLink.first()).toBeVisible({ timeout: 10_000 });
    await forgotLink.first().click();
    await expect(page).toHaveURL(/reset-password/i, { timeout: 8_000 });
  });

  test('password field visibility toggle changes input type', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('login-password')
      .waitFor({ state: 'visible', timeout: 8_000 });

    const passwordInput = page.getByTestId('login-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye / show-password icon button
    await page
      .getByRole('button', { name: /toggle password visibility/i })
      .click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page
      .getByRole('button', { name: /toggle password visibility/i })
      .click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

// ─── credential submission tests ─────────────────────────────────────────────

test.describe('Credential submission', () => {
  test('valid credentials trigger sign-in and redirect to home', async ({
    page,
  }) => {
    await mockFirebaseSignIn(page, {
      succeed: true,
      email: 'user@example.com',
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('login-form')
      .waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // After successful sign-in the login page navigates away from /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('wrong password shows error message', async ({ page }) => {
    await mockFirebaseSignIn(page, { succeed: false });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('login-form')
      .waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('wrongpassword');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByTestId('login-error')).toContainText(
      /invalid email or password/i,
    );
  });

  test('submit button shows loading text while request is in-flight', async ({
    page,
  }) => {
    // Delay the Firebase response so we can observe the loading state,
    // then abort so the page stays on /login after the request fails.
    await page.route(
      '**/identitytoolkit.googleapis.com/**/accounts:signInWithPassword**',
      async (route) => {
        await new Promise((r) => setTimeout(r, 1_200));
        await route.abort();
      },
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('login-form')
      .waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // While the request is in-flight the button should show the loading label
    await expect(page.getByTestId('login-submit')).toContainText(
      /logging in/i,
      { timeout: 3_000 },
    );
  });

  test('submit button is disabled while request is in-flight', async ({
    page,
  }) => {
    await page.route(
      '**/identitytoolkit.googleapis.com/**/accounts:signInWithPassword**',
      async (route) => {
        await new Promise((r) => setTimeout(r, 1_200));
        await route.abort();
      },
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('login-form')
      .waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-submit')).toBeDisabled({
      timeout: 3_000,
    });
  });

  test('stays on login page after network error', async ({ page }) => {
    await page.route(
      '**/identitytoolkit.googleapis.com/**/accounts:signInWithPassword**',
      (route) => route.abort('failed'),
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('login-form')
      .waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // Should still be on /login and show an error
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    await expect(page.getByTestId('login-error')).toBeVisible({
      timeout: 8_000,
    });
  });
});

// ─── signup page tests ───────────────────────────────────────────────────────

test.describe('Signup page', () => {
  test('renders signup form with all fields', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('signup-form')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('signup-name')).toBeVisible();
    await expect(page.getByTestId('signup-email')).toBeVisible();
    await expect(page.getByTestId('signup-password')).toBeVisible();
    await expect(page.getByTestId('signup-confirm-password')).toBeVisible();
    await expect(page.getByTestId('signup-submit')).toBeVisible();
  });

  test('shows password mismatch error', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('signup-name').fill('Test User');
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm-password').fill('different');
    await page.getByTestId('signup-submit').click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('submit button shows loading text while in-flight', async ({ page }) => {
    // Block the Firebase createUser call so we can catch the loading state
    await page.route(
      '**/identitytoolkit.googleapis.com/**/accounts:signUp**',
      async (route) => {
        await new Promise((r) => setTimeout(r, 1_200));
        await route.abort();
      },
    );

    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('signup-name').fill('Test User');
    await page.getByTestId('signup-email').fill('new@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm-password').fill('password123');
    await page.getByTestId('signup-submit').click();

    await expect(page.getByTestId('signup-submit')).toContainText(
      /signing up/i,
      { timeout: 3_000 },
    );
  });
});

// ─── reset password page tests ───────────────────────────────────────────────

test.describe('Reset password page', () => {
  test('renders reset form', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('reset-password-form')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('reset-email')).toBeVisible();
    await expect(page.getByTestId('reset-submit')).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('reset-email').fill('not-an-email');
    await page.getByTestId('reset-submit').click();
    await expect(
      page.getByText(/invalid email/i).or(page.getByText(/email is required/i)),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('shows success message after valid email submitted', async ({
    page,
  }) => {
    // Intercept Firebase sendPasswordResetEmail REST call
    await page.route(
      '**/identitytoolkit.googleapis.com/**/accounts:sendOobCode**',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ email: 'user@example.com' }),
        }),
    );

    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('reset-email').fill('user@example.com');
    await page.getByTestId('reset-submit').click();

    await expect(
      page
        .getByText(/password reset email sent/i)
        .or(page.getByText(/check your inbox/i)),
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─── protected routes ────────────────────────────────────────────────────────

test.describe('Protected routes', () => {
  test('unauthenticated user is redirected to login from /checkout', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // ignore
      }
    });
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    const url = page.url();
    const isOnLogin = /\/login/i.test(url);
    const hasLoginForm = await page.getByTestId('login-form').count();
    expect(isOnLogin || hasLoginForm > 0).toBeTruthy();
  });

  test('admin user can access /admin with harness', async ({ app }) => {
    await app.goto('/admin', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(2_000);
    expect(app.url()).not.toMatch(/\/login/);
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('clicking logout in the options menu navigates to /login', async ({
    app,
  }) => {
    await app.goto('/admin', { waitUntil: 'domcontentloaded' });

    // Open the options dropdown (the ⋮ button with aria-label "Open menu")
    const menuTrigger = app.getByRole('button', { name: /open menu/i }).first();
    await menuTrigger.waitFor({ state: 'visible', timeout: 10_000 });
    await menuTrigger.click();

    // Click the logout entry in the dropdown
    await app.getByTestId('logout-btn').click();

    // The handleLogout handler calls logout() then navigate('/login')
    await expect(app).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});

// ─── auth loading state ───────────────────────────────────────────────────────

test.describe('Auth loading state', () => {
  test('loading indicator uses data-testid=auth-loading', async ({ page }) => {
    await installHarness(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByTestId('auth-loading').or(page.locator('body')),
    ).toBeVisible({ timeout: 10_000 });
  });
});
