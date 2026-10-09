// =============================================================================
// tests/regression/robustness.spec.ts — Unexpected user behaviour
// =============================================================================
// Double clicks, refreshes, Back button, multiple tabs, deep links.
// These are the paths real users take and scripted happy paths never do.
// =============================================================================

import { test, expect } from '../../fixtures';
import { CART_STORAGE_KEY, CHECKOUT_INFO, PRODUCTS, ROUTES } from '../../utils/test-data';

test.describe('Robustness', { tag: ['@regression', '@robustness'] }, () => {
  test.beforeEach(async ({ loggedInPage: _page }) => {});

  test('ROB-001 double-click on Add to cart never stores the product twice', async ({ inventoryPage, page }) => {
    await inventoryPage.item(PRODUCTS.backpack).getByRole('button', { name: 'Add to cart' }).dblclick();
    // The 2nd click may land on the "Remove" button that replaced "Add to cart":
    // the end state may be 0 or 1 item, but never a duplicate, and UI = storage.
    const stored: number[] = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), CART_STORAGE_KEY);
    expect(stored.length).toBeLessThanOrEqual(1);
    await inventoryPage.header.expectCartCount(stored.length);
  });

  test('ROB-002 refreshing the overview keeps the order summary', async ({ seedCart, cartPage, checkoutPage, page }) => {
    await seedCart([PRODUCTS.backpack]);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);

    await page.reload();
    await expect(page).toHaveURL(/checkout-step-two/);
    await expect(checkoutPage.summaryItemNames).toHaveText([PRODUCTS.backpack]);
  });

  test('ROB-003 Back after a completed order does not resurrect the cart', async ({ seedCart, cartPage, checkoutPage, page }) => {
    await seedCart([PRODUCTS.onesie]);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    await checkoutPage.clickFinish();

    await page.goBack();
    await expect(page).toHaveURL(/checkout-step-two/);
    await expect(checkoutPage.summaryItemNames).toHaveCount(0);
    await checkoutPage.header.expectCartCount(0);
  });

  test('ROB-004 deep link + refresh on any page restores the right screen', async ({ page, cartPage }) => {
    await page.goto(ROUTES.cart);
    await page.reload();
    await cartPage.expectLoaded();
  });

  test('ROB-005 two tabs of the same session share the cart after reload', async ({ context, inventoryPage }) => {
    const second = await context.newPage();
    await second.goto(ROUTES.inventory);

    await inventoryPage.addToCart(PRODUCTS.bikeLight);
    await second.reload();
    await expect(second.getByTestId('shopping-cart-badge')).toHaveText('1');
  });

  test('ROB-006 browser Back/Forward between catalog and detail keeps state', async ({ inventoryPage, productPage, page }) => {
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.openProduct(PRODUCTS.backpack);
    await page.goBack();
    await inventoryPage.expectLoaded();
    await page.goForward();
    await expect(productPage.removeButton).toBeVisible();
    await productPage.header.expectCartCount(1);
  });
});
