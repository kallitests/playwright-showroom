// =============================================================================
// fixtures/index.ts — Project-wide Playwright fixtures
// =============================================================================
// One import for every spec:
//   import { test, expect } from '../../fixtures';
//
// What it provides
//   - Page objects (loginPage, inventoryPage, productPage, cartPage, checkoutPage)
//   - `user` option + `loggedInPage`: tests start authenticated via the session
//     cookie (no login UI), and can switch persona with test.use({ user: 'problem' })
//   - `seedCart(names)`: set a cart precondition through localStorage in 1 step
//   - `runtimeErrors`: uncaught JS errors collected for the test, attached on failure
//
// Every test gets a fresh BrowserContext => isolated cookies/localStorage,
// no ordering dependency between tests.
// =============================================================================

import { test as base, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { loginViaCookie } from '../utils/helpers';
import { CART_STORAGE_KEY, ROUTES, USERS, productByName, type ProductName, type UserKey } from '../utils/test-data';

type Options = {
  /** Persona used by `loggedInPage` (default: standard). */
  user: UserKey;
};

type Fixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  productPage: ProductDetailPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /** Page authenticated as `user`, opened on /inventory.html. */
  loggedInPage: Page;
  /** v1 name kept for backward compatibility (same as loggedInPage). */
  authenticatedPage: Page;
  seedCart: (names: ProductName[]) => Promise<void>;
  runtimeErrors: string[];
};

export const test = base.extend<Options & Fixtures>({
  user: ['standard', { option: true }],

  runtimeErrors: async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await use(errors);
    if (errors.length && testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('runtime-errors', { body: errors.join('\n'), contentType: 'text/plain' });
    }
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  productPage: async ({ page }, use) => use(new ProductDetailPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),

  loggedInPage: async ({ page, context, user }, use) => {
    await loginViaCookie(context, USERS[user].username);
    await page.goto(ROUTES.inventory);
    await expect(page.getByTestId('inventory-list')).toBeVisible();
    await use(page);
  },

  authenticatedPage: async ({ loggedInPage }, use) => use(loggedInPage),

  seedCart: async ({ page }, use) => {
    await use(async (names) => {
      const ids = names.map((n) => productByName(n).id);
      // localStorage is origin-scoped: make sure we are on the app origin first.
      if (!page.url().startsWith('http')) await page.goto(ROUTES.login);
      await page.evaluate(([key, value]) => localStorage.setItem(key, value), [CART_STORAGE_KEY, JSON.stringify(ids)]);
      await page.reload();
    });
  },
});

export { expect };
