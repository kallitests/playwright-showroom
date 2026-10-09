// =============================================================================
// tests/ui/cart.spec.ts — Cart: add/remove, consistency, persistence
// =============================================================================
// Risks covered: badge/cart desynchronisation, lost cart, wrong quantities,
// state not reset when the user asks for it.
// =============================================================================

import { test, expect } from '../../fixtures';
import { CART_STORAGE_KEY, PRODUCTS, productByName } from '../../utils/test-data';

test.describe('Cart — UI', { tag: ['@ui', '@cart'] }, () => {
  test.beforeEach(async ({ loggedInPage: _page }) => {});

  test('CART-002 several products: badge, cart list and prices agree', async ({ inventoryPage, cartPage }) => {
    const picked = [PRODUCTS.backpack, PRODUCTS.bikeLight, PRODUCTS.fleeceJacket];
    for (const name of picked) await inventoryPage.addToCart(name);

    await inventoryPage.header.expectCartCount(picked.length);
    await inventoryPage.header.openCart();
    await cartPage.expectItems(picked);
    expect(await cartPage.prices()).toEqual(picked.map((n) => productByName(n).price));
  });

  test('CART-003 removing an item from the cart page updates list and badge', async ({ inventoryPage, cartPage }) => {
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.addToCart(PRODUCTS.bikeLight);
    await inventoryPage.header.openCart();

    await cartPage.removeItem(PRODUCTS.backpack);

    await cartPage.expectItems([PRODUCTS.bikeLight]);
    await cartPage.header.expectCartCount(1);
  });

  test('CART-004 Add/Remove toggle on the catalog is reversible', async ({ inventoryPage }) => {
    await inventoryPage.addToCart(PRODUCTS.boltTshirt);
    await inventoryPage.header.expectCartCount(1);
    await inventoryPage.removeFromCart(PRODUCTS.boltTshirt);

    await inventoryPage.header.expectCartCount(0);
    await expect(inventoryPage.item(PRODUCTS.boltTshirt).getByRole('button', { name: 'Add to cart' })).toBeVisible();
  });

  test('CART-005 product added from the detail page appears in the cart', async ({ inventoryPage, productPage, cartPage }) => {
    await inventoryPage.openProduct(PRODUCTS.fleeceJacket);
    await productPage.addToCartButton.click();
    await expect(productPage.removeButton).toBeVisible();
    await productPage.header.expectCartCount(1);

    await productPage.header.openCart();
    await cartPage.expectItems([PRODUCTS.fleeceJacket]);
  });

  test('CART-006 cart survives a page reload', async ({ inventoryPage, page }) => {
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await page.reload();
    await inventoryPage.header.expectCartCount(1);
  });

  test('CART-007 Continue Shopping keeps the cart and the button states', async ({ inventoryPage, cartPage }) => {
    await inventoryPage.addToCart(PRODUCTS.onesie);
    await inventoryPage.header.openCart();
    await cartPage.clickContinueShopping();

    await inventoryPage.expectLoaded();
    await expect(inventoryPage.item(PRODUCTS.onesie).getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('CART-008 Reset App State empties the cart', async ({ inventoryPage, page }) => {
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.addToCart(PRODUCTS.onesie);
    await inventoryPage.header.resetAppState();

    await inventoryPage.header.expectCartCount(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), CART_STORAGE_KEY)).toBeNull();
  });

  test('CART-009 quantity is fixed to 1 per product (no duplicates)', async ({ seedCart, cartPage }) => {
    await seedCart([PRODUCTS.backpack, PRODUCTS.bikeLight]);
    await cartPage.goto();
    await expect(cartPage.itemQuantities).toHaveText(['1', '1']);
  });

  test('CART-011 the cart is driven by localStorage (UI ⇄ storage in sync)', async ({ seedCart, inventoryPage, page }) => {
    // Precondition set in one step through storage — no clicking required.
    await seedCart([PRODUCTS.tshirtRed]);
    await inventoryPage.header.expectCartCount(1);

    await inventoryPage.addToCart(PRODUCTS.backpack);
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), CART_STORAGE_KEY);
    expect([...stored].sort()).toEqual([productByName(PRODUCTS.tshirtRed).id, productByName(PRODUCTS.backpack).id].sort());
  });
});
