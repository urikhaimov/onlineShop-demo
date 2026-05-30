import nx from '@nx/eslint-plugin';
import jsLint from '@eslint/js';
import tsLint from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
// @ts-expect-error - this is a workaround for the import plugin not being typed correctly.
import json from 'eslint-plugin-json';
// @ts-expect-error - this is a workaround for the import plugin not being typed correctly.
import * as importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import * as mdx from 'eslint-plugin-mdx';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  jsLint.configs.recommended,
  {
    ignores: [
      '**/dist',
      '**/webpack.config.*',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '.nx/**',
      '**/.nx/**',
      'scripts/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        sourceType: 'module',
        ecmaVersion: 'latest',
        project: './tsconfig.base.json',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
        ...globals.serviceworker,
        __dirname: 'readonly',
        __filename: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
        vi: 'readonly',
        spyOn: 'readonly',
        console: 'readonly',
        process: 'readonly',
        NodeJS: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'warn',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    plugins: {
      jsdoc,
      import: importPlugin,
      json,
      mdx,
      '@typescript-eslint': tsLint,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsLint.configs.recommended.rules,
      ...prettierConfig.rules,
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      // 'no-console': 'warn',
      'no-debugger': 'warn',
      'no-duplicate-imports': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      quotes: ['warn', 'single'],
      semi: ['error', 'always'],
      'linebreak-style': ['error', 'unix'],
      eqeqeq: ['error', 'always'],
      'max-len': [
        'warn',
        {
          code: 80,
          ignoreComments: true,
          ignoreTrailingComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignorePattern: '^\\s*import\\s+.*\\s+from\\s+["\'].*["\']',
        },
      ],
      'prettier/prettier': [
        'error',
        { trailingComma: 'all', semi: true, singleQuote: true },
      ],
      'import/no-unresolved': 0,
      'import/extensions': 1,
      'import/named': 1,
      'import/namespace': 1,
      'import/default': 1,
      'import/export': 1,
      'jsdoc/require-param': ['warn', { contexts: ['TSParameterProperty'] }],
      'jsdoc/require-param-description': [
        'warn',
        { contexts: ['TSParameterProperty'] },
      ],
      'jsdoc/require-param-name': [
        'warn',
        { contexts: ['TSParameterProperty'] },
      ],
      'jsdoc/require-returns': ['warn', { contexts: ['TSPropertySignature'] }],
      'jsdoc/require-returns-description': [
        'warn',
        { contexts: ['TSPropertySignature'] },
      ],
      'jsdoc/require-returns-type': [
        'warn',
        { contexts: ['TSPropertySignature'] },
      ],
      'jsdoc/require-description': [
        'warn',
        { contexts: ['TSPropertySignature'] },
      ],
    },
  },

  /** ⬇️ Disable type-aware linting for plain JS scripts outside the TS project */
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: false,
      },
    },
  },

  /** ⬇️ Disable type-aware linting for build/test config files */
  {
    files: [
      '**/vitest*.config.*',
      '**/vite*.config.*',
      '**/*.config.ts',
      'vitest.smoke.config.ts',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: false,
      },
    },
  },

  /** ⬇️ Relax rules in test files — empty no-op stubs for browser APIs
   * (IntersectionObserver, MediaQueryList) and library inits are intentional. */
  {
    files: [
      '**/tests/**/*.ts',
      '**/tests/**/*.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      'no-empty': 'off',
    },
  },
];
