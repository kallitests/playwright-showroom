// =============================================================================
// tests/smoke/inventory.spec.ts — Catalog, cart and purchase smoke (@smoke)
// =============================================================================

import { test, expect } from '../../fixtures';
import { CATALOG, CHECKOUT_INFO, PRODUCTS } from '../../utils/test-data';

test.describe('Catalog & cart — smoke', { tag: ['@smoke'] }, () => {
  test('CAT-001 catalog shows the 6 reference products', { tag: ['@catalog', '@critical'] }, async ({ loggedInPage: _page, inventoryPage }) => {
    await expect(inventoryPage.items).toHaveCount(CATALOG.length);
    expect((await inventoryPage.names()).sort()).toEqual(CATALOG.map((p) => p.name).sort());
  });

  test('CART-001 adding a product updates the cart badge', { tag: ['@cart', '@critical'] }, async ({ loggedInPage: _page, inventoryPage }) => {
    await inventoryPage.header.expectCartCount(0);
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.header.expectCartCount(1);
  });

  test('CHK-001 golden path: one product purchased end-to-end', { tag: ['@checkout', '@critical'] }, async ({
    loggedInPage: _page,
    inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.header.openCart();
    await cartPage.expectItems([PRODUCTS.backpack]);
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    await checkoutPage.clickFinish();
    await checkoutPage.expectOrderConfirmed();
  });
});
