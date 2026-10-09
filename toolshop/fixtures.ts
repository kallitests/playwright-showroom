// =============================================================================
// toolshop/fixtures.ts — Fixtures for the Toolshop suite
// =============================================================================
//   api              anonymous API client (APIRequestContext on the API host)
//   customerApi      API client authenticated as the public demo customer
//   throwawayUser    freshly registered customer (safe for lockout / negative tests)
//   loggedInPage     browser page already signed in: the JWT obtained through the
//                    API is written to localStorage before the app boots
//   withCart(lines)  creates a cart through the API and hands it to the browser
//                    session (sessionStorage) — UI tests start on a ready cart
//   page objects     catalogPage, productPage, checkoutPage, loginPage, contactPage
// =============================================================================

import { test as base, expect, type Page } from '@playwright/test';
import { ToolshopApi } from './api/ToolshopApi';
import type { Product } from './api/schemas';
import { ACCOUNTS, API_URL, STORAGE, type Account } from './config';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { ProductPage } from './pages/ProductPage';

type Fixtures = {
  api: ToolshopApi;
  customerApi: ToolshopApi;
  throwawayUser: Account & { id: string };
  loggedInPage: Page;
  withCart: (lines: { product: Product; quantity: number }[]) => Promise<string>;
  catalogPage: CatalogPage;
  productPage: ProductPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
  contactPage: ContactPage;
};

export const test = base.extend<Fixtures>({
  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL });
    await use(new ToolshopApi(ctx));
    await ctx.dispose();
  },

  customerApi: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL });
    const client = new ToolshopApi(ctx);
    await client.login(ACCOUNTS.customer);
    await use(client);
    await ctx.dispose();
  },

  throwawayUser: async ({ api }, use) => {
    await use(await api.registerThrowawayUser());
  },

  loggedInPage: async ({ page, customerApi }, use) => {
    const token = customerApi.accessToken!;
    // Runs before any app script; seeds the token only on the first load of the
    // tab so that a later logout is not silently undone on the next navigation.
    await page.addInitScript(
      ([key, value]) => {
        if (!window.sessionStorage.getItem('__pw_token_seeded')) {
          window.sessionStorage.setItem('__pw_token_seeded', '1');
          window.localStorage.setItem(key, value);
        }
      },
      [STORAGE.authToken, token] as const,
    );
    await page.goto('/');
    await expect(page.getByTestId('nav-menu')).toBeVisible();
    await use(page);
  },

  withCart: async ({ page, api }, use) => {
    await use(async (lines) => {
      const cartId = await api.cartWith(lines);
      const quantity = lines.reduce((n, l) => n + l.quantity, 0);
      await page.addInitScript(
        ([idKey, id, qtyKey, qty]) => {
          // Only seed once per tab: later navigations keep the app's own state.
          if (!window.sessionStorage.getItem(idKey)) {
            window.sessionStorage.setItem(idKey, id);
            window.sessionStorage.setItem(qtyKey, qty);
          }
        },
        [STORAGE.cartId, cartId, STORAGE.cartQuantity, String(quantity)] as const,
      );
      return cartId;
    });
  },

  catalogPage: async ({ page }, use) => use(new CatalogPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  contactPage: async ({ page }, use) => use(new ContactPage(page)),
});

export { expect };
