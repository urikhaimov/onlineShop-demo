// apps/client-e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const usePreview = !!process.env.PW_PREVIEW;
const cwdRoot = path.resolve(__dirname, '../../'); // repo root
const HOST = process.env.PW_HOST ?? '127.0.0.1';
const PORT = Number(process.env.PW_PORT ?? 5173);
const BASE_URL = process.env.PW_BASE_URL ?? `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './src/e2e',
  testMatch: [
    '**/*.pw.spec.ts',
    '**/*.pw.spec.cts',
    '**/*.pw.spec.*',
    '**/*.spec.*',
    '**/*.spec.mts', // ✅ add thi
  ],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
    viewport: { width: 1280, height: 900 },
  },

  // Start app server for tests. Preview = build + serve /dist; else dev server.
  webServer: usePreview
    ? {
        // You can override with PW_PREVIEW_CMD if needed.
        command:
          process.env.PW_PREVIEW_CMD ??
          [
            'npx nx build client --skip-nx-cache',
            `npx vite preview --host ${HOST} --port ${PORT} --strictPort --config apps/client/vite.config.mts`,
          ].join(' && '),
        port: PORT,
        reuseExistingServer: true,
        timeout: 180_000,
        cwd: cwdRoot,
        env: { E2E: '1' }, // disables proxy/CSP etc. in your vite config
      }
    : {
        command: `npx vite --host ${HOST} --port ${PORT} --strictPort --config apps/client/vite.config.mts`,
        port: PORT,
        reuseExistingServer: true,
        timeout: 120_000,
        cwd: cwdRoot,
        env: { E2E: '1' },
      },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
