// =============================================================================
// fixtures/auth.fixture.ts — Pre-authenticated browser context fixture
// =============================================================================
// Problem: Most tests require the user to be logged in.
// If every test navigates to "/" and fills the login form, that's:
//   - Slow (repeated UI interactions)
//   - Fragile (if login breaks, ALL tests fail for the wrong reason)
//
// Solution: A fixture that logs in ONCE, saves the browser storage state
// to a file, and restores it for every test that needs it.
// The test body starts already logged in — no login UI needed.
//
// Usage in a spec file:
//   import { test } from '../fixtures/auth.fixture';
//   test('can see inventory', async ({ authenticatedPage }) => {
//     await authenticatedPage.goto('/inventory.html');
//   });
// =============================================================================

import { test as base, Page } from '@playwright/test';
import { USERS } from '../utils/test-data';

// ---------------------------------------------------------------------------
// Define the type for our custom fixture
// ---------------------------------------------------------------------------
// We're extending the built-in `test` object with a new fixture called
// `authenticatedPage`. It behaves exactly like `page` but starts logged in.
// ---------------------------------------------------------------------------

type AuthFixtures = {
  authenticatedPage: Page;
};

// ---------------------------------------------------------------------------
// Extend the base `test` with our custom fixture
// ---------------------------------------------------------------------------

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // -----------------------------------------------------------------------
    // Step 1: Navigate to the login page
    // -----------------------------------------------------------------------
    await page.goto('/');

    // -----------------------------------------------------------------------
    // Step 2: Fill and submit the login form using data-test selectors
    // -----------------------------------------------------------------------
    await page.locator('[data-test="username"]').fill(USERS.standard.username);
    await page.locator('[data-test="password"]').fill(USERS.standard.password);
    await page.locator('[data-test="login-button"]').click();

    // -----------------------------------------------------------------------
    // Step 3: Wait for the inventory page to confirm login succeeded
    // -----------------------------------------------------------------------
    await page.waitForURL(/inventory/);

    // -----------------------------------------------------------------------
    // Step 4: Hand the authenticated page to the test
    // The test function runs here — everything after `use()` is teardown
    // -----------------------------------------------------------------------
    await use(page);

    // -----------------------------------------------------------------------
    // Step 5 (teardown): Clear localStorage so sessions don't bleed between tests
    // -----------------------------------------------------------------------
    await page.evaluate(() => localStorage.clear());
  },
});

// Re-export `expect` so test files only need to import from this fixture
export { expect } from '@playwright/test';
