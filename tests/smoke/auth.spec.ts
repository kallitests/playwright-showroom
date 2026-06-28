// =============================================================================
// tests/smoke/auth.spec.ts — Authentication smoke tests
// =============================================================================
// WHAT ARE SMOKE TESTS?
//   Smoke tests are the smallest, fastest subset of your test suite.
//   They verify that the most critical paths work — if ANY smoke test fails,
//   there's no point running the full suite.
//
// WHAT THIS FILE TESTS:
//   The login page is the ENTRY POINT of the entire app.
//   If login is broken, nothing else works. So this is our #1 priority.
//
// TARGET: https://www.saucedemo.com (login page at /)
// RUN:    npx playwright test tests/smoke/auth.spec.ts
// =============================================================================

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import {
  USERS,
  INVALID_CREDENTIALS,
  ERROR_MESSAGES,
} from '../../utils/test-data';

// ---------------------------------------------------------------------------
// Group all auth smoke tests inside a describe block
// describe() is just a label — it groups tests in the HTML report
// ---------------------------------------------------------------------------

test.describe('🔐 Authentication — Smoke Tests', () => {

  // -------------------------------------------------------------------------
  // TEST 1: Successful login with valid credentials
  // -------------------------------------------------------------------------
  // This is the most important test in the entire suite.
  // If users can't log in, nothing else matters.
  // -------------------------------------------------------------------------

  test('should log in successfully with standard_user', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();

    // Fill credentials and submit
    await loginPage.login(USERS.standard.username, USERS.standard.password);

    // Assert: URL must contain "inventory" after successful login
    await loginPage.expectSuccessfulLogin();

    // Also assert the page title so we know we're on the right page
    await expect(page).toHaveTitle('Swag Labs');
  });

  // -------------------------------------------------------------------------
  // TEST 2: Wrong password — error message must appear
  // -------------------------------------------------------------------------
  // Negative tests are equally important: we must handle bad credentials
  // gracefully and show a clear error to the user.
  // -------------------------------------------------------------------------

  test('should show error when password is wrong', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      INVALID_CREDENTIALS.wrongPassword.username,
      INVALID_CREDENTIALS.wrongPassword.password
    );

    // Assert: the error container must be visible with the correct message
    await loginPage.expectError(ERROR_MESSAGES.invalidCredentials);

    // Assert: we did NOT navigate away — still on the login page
    await expect(page).toHaveURL('/');
  });

  // -------------------------------------------------------------------------
  // TEST 3: Empty username — specific validation error
  // -------------------------------------------------------------------------
  // SauceDemo validates each field separately and shows different messages.
  // We test each empty-field case to verify the validation logic.
  // -------------------------------------------------------------------------

  test('should show "Username is required" when username is empty', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    // Note: we pass empty string for username but a valid password
    await loginPage.login('', USERS.standard.password);

    await loginPage.expectError(ERROR_MESSAGES.usernameRequired);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Empty password — specific validation error
  // -------------------------------------------------------------------------

  test('should show "Password is required" when password is empty', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(USERS.standard.username, '');

    await loginPage.expectError(ERROR_MESSAGES.passwordRequired);
  });

  // -------------------------------------------------------------------------
  // TEST 5: Locked-out user — specific error message
  // -------------------------------------------------------------------------
  // The locked_out_user account exists specifically to test this scenario.
  // Many real apps have account suspension — this tests that path.
  // -------------------------------------------------------------------------

  test('should show locked-out error for locked_out_user', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(USERS.lockedOut.username, USERS.lockedOut.password);

    // The error message for locked users is different from invalid credentials
    await loginPage.expectError(ERROR_MESSAGES.lockedOut);
  });

  // -------------------------------------------------------------------------
  // TEST 6: Logout — user must be returned to the login page
  // -------------------------------------------------------------------------
  // Logging out is part of the core auth flow.
  // After logout, the user must NOT be able to access /inventory.html
  // -------------------------------------------------------------------------

  test('should log out and redirect to login page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // First, log in
    await loginPage.goto();
    await loginPage.login(USERS.standard.username, USERS.standard.password);
    await loginPage.expectSuccessfulLogin();

    // Open the hamburger menu (top-left of the header)
    await page.locator('#react-burger-menu-btn').click();

    // Wait for the sidebar to appear before clicking logout
    // This prevents clicking before the animation completes
    const logoutLink = page.locator('#logout_sidebar_link');
    await logoutLink.waitFor({ state: 'visible' });
    await logoutLink.click();

    // Assert: we're back on the login page
    await expect(page).toHaveURL('/');

    // Assert: the login form is visible again
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // TEST 7: Post-logout access control
  // -------------------------------------------------------------------------
  // After logging out, navigating directly to /inventory.html should
  // redirect back to the login page — not show the protected page.
  // -------------------------------------------------------------------------

  test('should redirect to login if accessing inventory while logged out', async ({
    page,
  }) => {
    // Try to access the inventory without logging in
    await page.goto('/inventory.html');

    // SauceDemo should redirect back to login
    await expect(page).toHaveURL('/');
  });
});
