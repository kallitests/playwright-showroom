// =============================================================================
// tests/smoke/auth.spec.ts — Authentication smoke (@smoke)
// =============================================================================
// Smallest set that proves the entry point works. If one of these fails, the
// rest of the pipeline is not worth running. Full negative matrix: tests/ui/.
// Test case IDs refer to docs/test-catalog.md.
// =============================================================================

import { test, expect } from '../../fixtures';
import { ERROR_MESSAGES, INVALID_CREDENTIALS, USERS } from '../../utils/test-data';

test.describe('Authentication — smoke', { tag: ['@smoke', '@auth'] }, () => {
  test('AUTH-001 standard_user logs in and lands on the catalog', { tag: '@critical' }, async ({ loginPage, inventoryPage, page }) => {
    await loginPage.goto();
    await loginPage.login(USERS.standard);

    await loginPage.expectSuccessfulLogin();
    await inventoryPage.expectLoaded();
    await expect(page).toHaveTitle('Swag Labs');
  });

  test('AUTH-002 wrong password is rejected with an explicit error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(INVALID_CREDENTIALS.wrongPassword);

    await loginPage.expectError(ERROR_MESSAGES.invalidCredentials);
    await loginPage.expectOnLoginPage();
  });

  test('AUTH-005 locked_out_user is refused', { tag: '@critical' }, async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(USERS.lockedOut);

    await loginPage.expectError(ERROR_MESSAGES.lockedOut);
    await loginPage.expectOnLoginPage();
  });

  test('AUTH-006 logout returns to the login page', { tag: '@critical' }, async ({ loggedInPage, inventoryPage, loginPage }) => {
    await expect(loggedInPage).toHaveURL(/inventory\.html/);
    await inventoryPage.header.logout();
    await loginPage.expectOnLoginPage();
  });

  test('AUTH-007 protected page redirects anonymous users to login', { tag: '@critical' }, async ({ page, loginPage }) => {
    await page.goto('/inventory.html');

    await loginPage.expectOnLoginPage();
    await loginPage.expectError(ERROR_MESSAGES.protectedRoute('/inventory.html'));
  });
});
