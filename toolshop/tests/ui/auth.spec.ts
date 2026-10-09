// =============================================================================
// toolshop/tests/ui/auth.spec.ts — Login UI: success, validation, error, logout, session
// =============================================================================
// Wrong-password scenarios use a throw-away user registered via the API
// (3 failures lock an account — never hammer the shared demo accounts).
// =============================================================================

import { test, expect } from '../../fixtures';
import { ACCOUNTS, STORAGE } from '../../config';
import { Header } from '../../pages/components/Header';

test.describe('Authentication — UI', { tag: ['@ui', '@toolshop', '@auth'] }, () => {
  test('TUAUTH-001 customer logs in through the form and lands on My account', { tag: ['@smoke', '@critical'] }, async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(ACCOUNTS.customer);

    await loginPage.expectOnAccountPage();
    await expect(page.getByTestId('nav-menu')).toContainText(`${ACCOUNTS.customer.firstName} ${ACCOUNTS.customer.lastName}`);
    expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE.authToken)).toBeTruthy();
  });

  test('TUAUTH-002 empty form shows required-field errors without calling the API', async ({ loginPage, page }) => {
    let loginCalls = 0;
    page.on('request', (r) => r.url().includes('/users/login') && loginCalls++);
    await loginPage.goto();
    await loginPage.submit.click();

    await expect(loginPage.emailError).toHaveText('Email is required');
    await expect(loginPage.passwordError).toHaveText('Password is required');
    expect(loginCalls).toBe(0);
  });

  test('TUAUTH-003 malformed e-mail is rejected client-side', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login({ email: 'not-an-email', password: 'whatever1' });
    await expect(loginPage.emailError).toHaveText('Email format is invalid');
  });

  test('TUAUTH-004 wrong password shows a generic error and stays on the login page', async ({ loginPage, throwawayUser, page }) => {
    await loginPage.goto();
    await loginPage.login({ email: throwawayUser.email, password: 'Wrong-password-1!' });

    await expect(loginPage.loginError).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TUAUTH-005 logout clears the session and protects the account area', async ({ loggedInPage, page }) => {
    await new Header(loggedInPage).logout();
    expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE.authToken)).toBeNull();

    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TUAUTH-006 API-issued token is honoured by the UI (hybrid login)', async ({ loggedInPage }) => {
    await loggedInPage.goto('/account');
    await expect(loggedInPage.getByTestId('page-title')).toHaveText('My account');
  });
});
