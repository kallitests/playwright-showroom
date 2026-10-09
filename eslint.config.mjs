// ESLint flat config — TypeScript + Playwright best-practice rules
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'playwright-report-toolshop/**',
      'test-results/**',
      'test-results-toolshop/**',
      'metrics-toolshop/**',
      'blob-report/**',
      'metrics/**',
      '.local-saucedemo/**',
      'scripts/**/*.py',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'fixtures/**/*.ts', 'toolshop/tests/**/*.ts', 'toolshop/fixtures.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error', // no arbitrary sleeps
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^expect', '\\.expect\\w*$'] }],
      'playwright/no-conditional-in-test': 'warn',
      'no-empty-pattern': 'off', // Playwright worker fixtures use `async ({}, use)`
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', fetch: 'readonly', URL: 'readonly' } },
  },
);
