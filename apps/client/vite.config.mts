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
  // @ts-expect-error - expected error
  const { default: react } = await import('@vitejs/plugin-react');

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
      // middlewareMode: true,
      headers: {
        'Content-Security-Policy': csp,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
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

    // 🔧 Vitest configuration for your login/logout tests
    test: {
      environment: 'jsdom',
      globals: true,
      css: true, // allow importing .css/.less in tests
      // matches your current file location
      setupFiles: path.resolve(__dirname, './src/tests/setupTests.ts'),
      include: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'tests/**/*.{test,spec}.{ts,tsx}',
      ],
      // ✅ fix deprecation: use server.deps.inline (not deps.inline)
      server: { deps: { inline: [/firebase\/.*/] } },
      passWithNoTests: true, // don't fail when there are no *.spec/test files yet
      coverage: {
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.d.ts', '**/*.stories.*', 'tests/**'],
        // 🔒 gates to catch regressions
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  };
});
