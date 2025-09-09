import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/e2e',
  testMatch: ['**/*.pw.spec.ts', '**/*.pw.spec.cts'],
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    headless: true,
  },

  // Start the client directly with Vite from the WORKSPACE ROOT,
  // and pass E2E=1 so the proxy is disabled in your Vite config.
  webServer: {
    command:
      process.env.PW_DEV ?? 'npx vite --config apps/client/vite.config.mts',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: '../../', // 👈 ensure we run from repo root
    env: { E2E: '1' }, // 👈 turns off /api proxy in Vite during e2e
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
