import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { API_URL, TOOLSHOP_ENV, UI_URL } from './toolshop/config';

// =============================================================================
// Playwright configuration — Toolshop suite (second application of the showroom)
// =============================================================================
//   npx playwright test -c playwright.toolshop.config.ts            # everything
//   npx playwright test -c playwright.toolshop.config.ts --project=api
//   TOOLSHOP_ENV=with-bugs npx playwright test -c playwright.toolshop.config.ts
//
// Projects:
//   api       API tests only — no browser started (fast, run on every push)
//   chromium  UI / E2E / exploratory, desktop Chrome
//   firefox, webkit  cross-browser (CI matrix)
// The UI is pinned to en-US: the app picks its language from the browser
// (navigator.language), which would make text assertions locale-dependent.
// =============================================================================

const IS_CI = !!process.env.CI;

const reporters: ReporterDescription[] = [
  [IS_CI ? 'github' : 'list'],
  ['html', { open: 'never', outputFolder: 'playwright-report-toolshop' }],
  ['junit', { outputFile: 'test-results-toolshop/junit.xml' }],
  ['json', { outputFile: 'test-results-toolshop/results.json' }],
  ['./reporters/metrics-reporter.ts', { outputDir: 'metrics-toolshop', catalogFile: 'toolshop/catalog/scenarios.json' }],
];

const browserTests = ['ui/**/*.spec.ts', 'e2e/**/*.spec.ts', 'exploratory/**/*.spec.ts'];

export default defineConfig({
  testDir: './toolshop/tests',
  outputDir: 'test-results-toolshop/artifacts',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  // Public shared demo: stay polite (limited parallelism, no load).
  workers: IS_CI ? 2 : 3,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: reporters,
  metadata: { app: 'Toolshop', environment: TOOLSHOP_ENV, ui: UI_URL, api: API_URL },

  use: {
    baseURL: UI_URL,
    testIdAttribute: 'data-test',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: 'api', testMatch: 'api/**/*.spec.ts', use: { baseURL: API_URL } },
    { name: 'chromium', testMatch: browserTests, use: { ...devices['Desktop Chrome'], locale: 'en-US' } },
    { name: 'firefox', testMatch: browserTests, use: { ...devices['Desktop Firefox'], locale: 'en-US' } },
    { name: 'webkit', testMatch: browserTests, use: { ...devices['Desktop Safari'], locale: 'en-US' } },
  ],
});
