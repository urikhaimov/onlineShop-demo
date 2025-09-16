import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.smoke.spec.ts', '**/*.smoke.spec.tsx'],
    environment: 'jsdom',
    reporters: [['default', { summary: false }]], // quiet like old "basic"
    passWithNoTests: true,
  },
});
