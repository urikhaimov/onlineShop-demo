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
        external: ['motion-dom'], // only if you're not using it directly
      },
      emptyOutDir: true,
      outDir: '../../dist/apps/client',
      reportCompressedSize: true,
      commonjsOptions: { transformMixedEsModules: true },
    },
  };
});
