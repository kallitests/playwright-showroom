// =============================================================================
// tests/regression/user-behaviors.spec.ts — Persona matrix (known behaviours)
// =============================================================================
// SauceDemo ships personas with DELIBERATE defects. These tests pin those
// behaviours so that any change (fixed, worse, different) is noticed.
// They are characterisation tests: they assert what the product does today,
// with an explicit annotation explaining why.
//
// v1 → v2 fixes
//   - performance_glitch_user: v1 stopped the clock at the URL change, before
//     the (blocking) render => the glitch was never measured. v2 waits for the
//     catalog to be visible.
//   - problem_user images: v1 used a selector that no longer exists.
//   - Hard 3 s login budget removed from the default run (network-dependent);
//     performance is measured relatively instead.
// =============================================================================

import { test, expect } from '../../fixtures';
import { login } from '../../utils/helpers';
import { CHECKOUT_INFO, PRODUCTS, USERS, productByName, type Credentials } from '../../utils/test-data';

async function timeToCatalog(page: import('@playwright/test').Page, user: Credentials): Promise<number> {
  await page.goto('/');
  const start = Date.now();
  await page.getByTestId('username').fill(user.username);
  await page.getByTestId('password').fill(user.password);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('inventory-list')).toBeVisible({ timeout: 20_000 });
  return Date.now() - start;
}

test.describe('Regression — personas', { tag: ['@regression', '@personas'] }, () => {
  test('USR-006 performance_glitch_user reaches the catalog markedly slower than standard_user', async ({ browser }, testInfo) => {
    test.slow();
    const standardCtx = await browser.newContext();
    const glitchCtx = await browser.newContext();
    try {
      const standard = await timeToCatalog(await standardCtx.newPage(), USERS.standard);
      const glitch = await timeToCatalog(await glitchCtx.newPage(), USERS.performanceGlitch);
      testInfo.annotations.push({ type: 'metric', description: `standard=${standard}ms glitch=${glitch}ms` });

      // The app blocks the main thread ~5 s for this persona; 2 s margin absorbs noise.
      expect(glitch - standard).toBeGreaterThan(2_000);
    } finally {
      await standardCtx.close();
      await glitchCtx.close();
    }
  });

  test.describe('problem_user', () => {
    test.use({ user: 'problem' });

    test('USR-001 every product image is the same "404" placeholder', async ({ loggedInPage: _page, inventoryPage }) => {
      const srcs = await inventoryPage.items.locator('img').evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => i.src));
      expect(srcs).toHaveLength(6);
      expect(new Set(srcs).size).toBe(1);
      expect(srcs[0]).toMatch(/sl-404/);
    });

    test('USR-002 some "Add to cart" buttons silently do nothing', async ({ loggedInPage: _page, inventoryPage }) => {
      test.info().annotations.push({ type: 'known-defect', description: 'Odd item ids cannot be added for problem_user' });
      await inventoryPage.addToCart(PRODUCTS.backpack); // id 4 (even) -> works
      await inventoryPage.header.expectCartCount(1);
      await inventoryPage.addToCart(PRODUCTS.boltTshirt); // id 1 (odd) -> ignored
      await inventoryPage.header.expectCartCount(1);
    });

    test('USR-003 typing the last name overwrites the first name field', async ({ loggedInPage: _page, seedCart, cartPage, checkoutPage }) => {
      test.info().annotations.push({ type: 'known-defect', description: 'Last name input writes into first name' });
      await seedCart([PRODUCTS.backpack]);
      await cartPage.goto();
      await cartPage.clickCheckout();
      await checkoutPage.firstNameInput.fill('Jane');
      await checkoutPage.lastNameInput.fill('Doe');

      await expect(checkoutPage.lastNameInput).toHaveValue('');
      await expect(checkoutPage.firstNameInput).not.toHaveValue('Jane');
    });

    test('USR-004 sorting has no effect', async ({ loggedInPage: _page, inventoryPage }) => {
      const before = await inventoryPage.names();
      await inventoryPage.sortBy('za');
      expect(await inventoryPage.names()).toEqual(before);
    });
  });

  test.describe('error_user', () => {
    test.use({ user: 'error' });

    test('USR-005 adding some products throws a runtime error and the cart is not updated', async ({
      loggedInPage: _page,
      inventoryPage,
      runtimeErrors,
    }) => {
      await inventoryPage.addToCart(PRODUCTS.boltTshirt); // odd id -> throws
      await expect.poll(() => runtimeErrors.length).toBeGreaterThan(0);
      await inventoryPage.header.expectCartCount(0);
    });

    test('USR-007 finishing an order does not empty the cart', async ({ loggedInPage: _page, seedCart, cartPage, checkoutPage }) => {
      await seedCart([PRODUCTS.backpack]);
      await cartPage.goto();
      await cartPage.clickCheckout();
      // Last name cannot be typed for error_user; the form still lets the user continue.
      await checkoutPage.firstNameInput.fill(CHECKOUT_INFO.valid.firstName);
      await checkoutPage.postalCodeInput.fill(CHECKOUT_INFO.valid.postalCode);
      await checkoutPage.clickContinue();
      await expect(checkoutPage.page).toHaveURL(/checkout-step-two/);

      await checkoutPage.finishButton.click();
      await checkoutPage.header.expectCartCount(1);
    });
  });

  test.describe('visual_user', () => {
    test.use({ user: 'visual' });

    test('USR-008 displayed prices differ from the reference catalog', async ({ loggedInPage: _page, inventoryPage }) => {
      const prices = await inventoryPage.prices();
      const reference = (await inventoryPage.names()).map((n) => productByName(n as never).price);
      expect(prices).not.toEqual(reference);
    });
  });
});

test.describe('Regression — cart persistence (v1, fixed)', { tag: ['@regression', '@cart'] }, () => {
  test('REG-001 cart items persist after page reload', async ({ loggedInPage, inventoryPage }) => {
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await loggedInPage.reload();
    await inventoryPage.header.expectCartCount(1);
  });

  test('REG-002 logging out does NOT clear the cart (current product behaviour)', async ({ page, inventoryPage, loginPage }) => {
    // v1 asserted the opposite and failed: the app only removes the session
    // cookie on logout. Verified live on www.saucedemo.com on 2026-10-09.
    // The product risk (cart leaking to the next user) is tracked as EXP-001.
    await login(page, USERS.standard);
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.header.logout();

    await loginPage.login(USERS.standard);
    await inventoryPage.header.expectCartCount(1);
  });
});
