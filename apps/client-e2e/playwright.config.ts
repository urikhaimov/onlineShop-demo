// apps/client-e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const usePreview = !!process.env.PW_PREVIEW;
const cwdRoot = path.resolve(__dirname, '../../'); // repo root

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

  webServer: usePreview
    ? {
        // ✅ Build + preview (serves built /dist/apps/client)
        command: [
          'npx nx build client --skip-nx-cache',
          // Serve with same host/port as dev so baseURL stays valid
          'npx vite preview --host 127.0.0.1 --port 5173 --strictPort --config apps/client/vite.config.mts',
        ].join(' && '),
        port: 5173,
        reuseExistingServer: true,
        timeout: 180_000,
        cwd: cwdRoot,
        env: { E2E: '1' }, // turns off proxy & CSP in your vite config
      }
    : {
        // Dev server for local debugging
        command:
          'npx vite --host 127.0.0.1 --port 5173 --strictPort --config apps/client/vite.config.mts',
        port: 5173,
        reuseExistingServer: true,
        timeout: 120_000,
        cwd: cwdRoot,
        env: { E2E: '1' },
      },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
