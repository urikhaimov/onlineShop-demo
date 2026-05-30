import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csp } from './csp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(async () => {
  // @ts-expect-error - Vite's dynamic import + default export
  const { default: react } = await import('@vitejs/plugin-react');

  // When E2E=1 (set by Playwright), disable API proxy AND CSP headers
  const isE2E = process.env.E2E === '1';

  // Print CSP once so you can confirm emulator hosts / scheme-level policy in dev
  console.log(
    '\n[CSP header that Vite will send]\n' +
      (isE2E ? '(disabled in E2E)' : csp) +
      '\n',
  );
  console.log(
    `[vite] E2E mode: ${isE2E ? 'ON (proxy disabled, CSP off)' : 'OFF (proxy enabled, CSP on)'}`,
  );

  return {
    cacheDir: '../../node_modules/.vite/apps/client',
    root: __dirname,
    publicDir: path.resolve(__dirname, '../../public'),

    plugins: [
      tsconfigPaths(),
      react(),
      nxViteTsPaths(),
      nxCopyAssetsPlugin(['*.md']),
    ],

    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true, // ensure Playwright hits the exact port
      // ✅ Turn CSP OFF in E2E to avoid blocking Vite dev scripts
      headers: isE2E ? undefined : { 'Content-Security-Policy': csp },
      proxy: isE2E
        ? undefined
        : {
            // forward /api -> http://localhost:3000/api (Nest)
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              secure: false,
              ws: true,
            },
          },
    },

    // ✅ Preview server mirrors dev host/port and sends no CSP
    preview: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      headers: undefined, // no CSP on preview
    },

    css: {
      preprocessorOptions: { less: { javascriptEnabled: true } },
    },

    build: {
      rollupOptions: {},
      emptyOutDir: true,
      outDir: '../../dist/apps/client',
      reportCompressedSize: true,
      commonjsOptions: { transformMixedEsModules: true },
      chunkSizeWarningLimit: 1000,
    },

    // 👇 Expose E2E flag to the client code
    define: {
      'import.meta.env.VITE_E2E': JSON.stringify(isE2E ? '1' : ''),
    },

    // 🔧 Vitest
    test: {
      environment: 'jsdom',
      globals: true,
      css: true, // allow importing .css/.less in tests
      setupFiles: path.resolve(__dirname, './src/tests/setupTests.ts'),
      include: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'tests/**/*.{test,spec}.{ts,tsx}',
      ],
      // ✅ ESM for tests (fixes "Vitest cannot be imported in a CommonJS module")
      tsconfig: path.resolve(__dirname, './tsconfig.vitest.json'),
      // ✅ inline Firebase deps for Vitest
      server: { deps: { inline: [/firebase\/.*/] } },
      passWithNoTests: true,
      environmentMatchGlobs: [
        ['**/*.node.spec.ts', 'node'],
        ['**/*.node.spec.tsx', 'node'],
      ],
      testTimeout: 30000,
      coverage: {
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.d.ts', '**/*.stories.*', 'tests/**'],
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  };
});
