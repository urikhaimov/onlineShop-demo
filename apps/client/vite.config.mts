// apps/client/vite.config.ts
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

  // Print CSP once so you can confirm emulator hosts / scheme-level policy in dev
  console.log('\n[CSP header that Vite will send]\n' + csp + '\n');

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
      headers: { 'Content-Security-Policy': csp },
      proxy: {
        // forward /api -> http://localhost:3000/api (Nest)
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          ws: true, // if your API exposes websockets
        },
      },
      // open: true,
      // strictPort: true,
    },

    css: {
      preprocessorOptions: {
        less: { javascriptEnabled: true },
      },
    },

    build: {
      rollupOptions: {
        // keep if you're not importing it directly to avoid bundling
        external: ['motion-dom'],
      },
      emptyOutDir: true,
      outDir: '../../dist/apps/client',
      reportCompressedSize: true,
      commonjsOptions: { transformMixedEsModules: true },
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
      // ✅ use server.deps.inline
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
