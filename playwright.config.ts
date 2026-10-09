import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { BASE_URL, IS_CI, IS_LOCAL_TARGET, LOCAL_PORT } from './utils/env';

// =============================================================================
// Playwright configuration
// =============================================================================
// - Target URL comes from the environment (BASE_URL / LOCAL_SAUCEDEMO), see utils/env.ts
// - Suites are organised by folder (smoke, ui, e2e, api, regression, exploratory)
//   AND by tags (@smoke, @critical, @regression, @known-issue ...) so that CI can
//   select tests by intent rather than by location.
// - Evidence (trace, screenshot, video) is kept for failures only.
// =============================================================================

const reporters: ReporterDescription[] = [
  [IS_CI ? 'github' : 'list'],
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['junit', { outputFile: 'test-results/junit.xml' }], // Azure DevOps / any CI
  ['json', { outputFile: 'test-results/results.json' }],
  ['./reporters/metrics-reporter.ts', { outputDir: 'metrics' }],
];

// Optional: Azure DevOps Test Plans reporter — enabled ONLY when configured.
// See docs/architecture.md § Azure DevOps. The package is not a hard dependency.
if (process.env.AZURE_DEVOPS_TOKEN && process.env.AZURE_DEVOPS_PLAN_ID) {
  try {
    require.resolve('@alex_neo/playwright-azure-reporter');
    reporters.push([
      '@alex_neo/playwright-azure-reporter',
      {
        orgUrl: process.env.AZURE_DEVOPS_ORG_URL,
        token: process.env.AZURE_DEVOPS_TOKEN,
        planId: Number(process.env.AZURE_DEVOPS_PLAN_ID),
        projectName: process.env.AZURE_DEVOPS_PROJECT,
        environment: process.env.TEST_ENVIRONMENT ?? 'saucedemo',
        testRunTitle: `Playwright Showroom — ${new Date().toISOString()}`,
        publishTestResultsMode: 'testRun',
        uploadAttachments: true,
      },
    ]);
  } catch {
    console.warn('[config] AZURE_DEVOPS_* set but @alex_neo/playwright-azure-reporter is not installed — skipped.');
  }
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: IS_CI,
  // One retry in CI: a test that passes on retry is reported as "flaky", which
  // feeds the flakiness metric instead of hiding the problem.
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: reporters,

  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-test', // SauceDemo exposes data-test attributes
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  // Local build of the official SauceDemo sources (offline / proxy-restricted runs)
  webServer: IS_LOCAL_TARGET
    ? {
        command: `node scripts/local-saucedemo/serve.mjs .local-saucedemo/sample-app-web/build ${LOCAL_PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 30_000,
      }
    : undefined,

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
