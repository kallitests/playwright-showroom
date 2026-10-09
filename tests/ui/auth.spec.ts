// =============================================================================
// tests/ui/auth.spec.ts — Authentication: negative matrix, session, access control
// =============================================================================
// Risk covered: unauthorised access, misleading errors, broken session handling.
// Data-driven where the steps are identical and only the data changes.
// =============================================================================

import { test, expect } from '../../fixtures';
import { ERROR_MESSAGES, INVALID_CREDENTIALS, ROUTES, SESSION_COOKIE, USERS } from '../../utils/test-data';

test.describe('Authentication — UI', { tag: ['@ui', '@auth'] }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  const rejected = [
    { id: 'AUTH-003', title: 'empty username', creds: INVALID_CREDENTIALS.emptyUsernameOnly, error: ERROR_MESSAGES.usernameRequired },
    { id: 'AUTH-003b', title: 'both fields empty', creds: INVALID_CREDENTIALS.empty, error: ERROR_MESSAGES.usernameRequired },
    { id: 'AUTH-004', title: 'empty password', creds: INVALID_CREDENTIALS.emptyPasswordOnly, error: ERROR_MESSAGES.passwordRequired },
    { id: 'AUTH-008a', title: 'unknown user', creds: INVALID_CREDENTIALS.unknownUser, error: ERROR_MESSAGES.invalidCredentials },
    { id: 'AUTH-008b', title: 'username is case-sensitive', creds: INVALID_CREDENTIALS.caseSensitiveUsername, error: ERROR_MESSAGES.invalidCredentials },
    { id: 'AUTH-008c', title: 'username is not trimmed', creds: INVALID_CREDENTIALS.trailingSpaceUsername, error: ERROR_MESSAGES.invalidCredentials },
    { id: 'AUTH-008d', title: 'injection-like input is treated as plain text', creds: INVALID_CREDENTIALS.sqlInjectionLike, error: ERROR_MESSAGES.invalidCredentials },
  ] as const;

  for (const { id, title, creds, error } of rejected) {
    test(`${id} login rejected — ${title}`, async ({ loginPage }) => {
      await loginPage.login(creds);
      await loginPage.expectError(error);
      await loginPage.expectOnLoginPage();
    });
  }

  test('AUTH-009 error banner can be dismissed', async ({ loginPage }) => {
    await loginPage.login(INVALID_CREDENTIALS.wrongPassword);
    await expect(loginPage.errorMessage).toBeVisible();

    await loginPage.errorCloseButton.click();
    await expect(loginPage.errorMessage).toBeHidden();
  });

  test('AUTH-012 login works with the keyboard only (Enter submits)', async ({ loginPage, page }) => {
    await loginPage.usernameInput.fill(USERS.standard.username);
    await loginPage.passwordInput.fill(USERS.standard.password);
    await loginPage.passwordInput.press('Enter');
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('AUTH-013 password field masks its content', async ({ loginPage }) => {
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Session & access control — UI', { tag: ['@ui', '@auth', '@security'] }, () => {
  for (const route of [ROUTES.inventory, ROUTES.cart, ROUTES.checkoutStepOne, ROUTES.checkoutStepTwo, ROUTES.checkoutComplete]) {
    test(`AUTH-007 anonymous access to ${route} is redirected with an explanation`, async ({ page, loginPage }) => {
      await page.goto(route);
      await loginPage.expectOnLoginPage();
      await loginPage.expectError(ERROR_MESSAGES.protectedRoute(route));
    });
  }

  test('AUTH-010 browser Back after logout does not reveal the catalog', async ({ loggedInPage, inventoryPage, loginPage }) => {
    await inventoryPage.header.logout();
    await loggedInPage.goBack();

    await loginPage.expectOnLoginPage();
  });

  test('AUTH-011 expired session (cookie gone) forces a new login', async ({ loggedInPage, context, loginPage }) => {
    // SauceDemo's session cookie lives 10 minutes; we simulate the expiry.
    await context.clearCookies({ name: SESSION_COOKIE });
    await loggedInPage.reload();

    await loginPage.expectOnLoginPage();
  });

  test('AUTH-014 session cookie is set on login and removed on logout', async ({ loginPage, inventoryPage, context }) => {
    await loginPage.goto();
    await loginPage.login(USERS.standard);
    await loginPage.expectSuccessfulLogin();
    expect((await context.cookies()).find((c) => c.name === SESSION_COOKIE)?.value).toBe(USERS.standard.username);

    await inventoryPage.header.logout();
    expect((await context.cookies()).find((c) => c.name === SESSION_COOKIE)).toBeUndefined();
  });
});
