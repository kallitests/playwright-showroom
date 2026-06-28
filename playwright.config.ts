import { defineConfig, devices } from '@playwright/test';

// ---------------------------------------------------------------------------
// Playwright configuration
// ---------------------------------------------------------------------------
// This file controls how Playwright runs all tests in this repo.
// It sets the base URL, timeouts, reporters, and browser projects.
// ---------------------------------------------------------------------------

export default defineConfig({
  // Root folder where Playwright looks for test files
  testDir: './tests',

  // Run all tests in parallel (each file gets its own worker)
  fullyParallel: true,

  // Fail the CI build if any test.only() was accidentally committed
  forbidOnly: !!process.env.CI,

  // Retry failed tests once in CI to reduce flakiness noise
  retries: process.env.CI ? 1 : 0,

  // Number of parallel workers (undefined = auto-detect CPU count)
  workers: process.env.CI ? 2 : undefined,

  // Reporters: HTML report for humans, list output for the terminal
  reporter: [
    ['html', { open: 'never' }], // generates playwright-report/index.html
    ['list'],                     // prints each test result inline
  ],

  // Global settings applied to every test unless overridden in the spec
  use: {
    // The base URL — all page.goto('/inventory') calls are relative to this
    baseURL: 'https://www.saucedemo.com',

    // Capture a trace on the first retry of a failing test
    // Open with: npx playwright show-trace trace.zip
    trace: 'on-first-retry',

    // Record a video only when a test fails
    video: 'on-first-retry',

    // Take a screenshot automatically on test failure
    screenshot: 'only-on-failure',

    // Default timeout for each action (click, fill, etc.)
    actionTimeout: 10_000,

    // Default timeout for each assertion (expect(...).toBe...)
    navigationTimeout: 15_000,
  },

  // ---------------------------------------------------------------------------
  // Projects — each project runs the full test suite in a different browser
  // ---------------------------------------------------------------------------
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
