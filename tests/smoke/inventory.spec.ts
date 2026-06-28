// =============================================================================
// tests/smoke/inventory.spec.ts — Inventory page smoke tests
// =============================================================================
// WHAT THIS FILE TESTS:
//   After login, the inventory page is the core of the app.
//   These smoke tests verify that:
//     - Products are visible
//     - The cart interaction works at a basic level
//     - The page doesn't crash on load
//
// We use the auth.fixture here to skip the login UI — tests start
// already authenticated, making the suite faster and more focused.
// =============================================================================

import { test, expect } from '../../fixtures/auth.fixture';
import { InventoryPage } from '../../pages/InventoryPage';
import { PRODUCTS } from '../../utils/test-data';

test.describe('🛍️ Inventory — Smoke Tests', () => {

  // -------------------------------------------------------------------------
  // TEST 1: Inventory page loads with products
  // -------------------------------------------------------------------------
  // The most basic check: can we see ANY products after logging in?
  // If this fails, the whole shopping experience is broken.
  // -------------------------------------------------------------------------

  test('should display the product list after login', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);

    // The fixture already logged us in, so we just navigate to inventory
    await inventoryPage.goto();

    // Assert: the inventory list container is visible
    await inventoryPage.expectLoaded();

    // Assert: there are exactly 6 products (SauceDemo always shows 6)
    const productCount = await inventoryPage.getAllProductNames().count();
    expect(productCount).toBe(6);
  });

  // -------------------------------------------------------------------------
  // TEST 2: Adding a product updates the cart badge
  // -------------------------------------------------------------------------
  // This verifies the core e-commerce interaction:
  //   user clicks "Add to cart" → cart count increments
  // -------------------------------------------------------------------------

  test('should update cart badge when adding a product', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    // Verify cart starts empty (badge should not be visible)
    const initialCount = await inventoryPage.getCartCount();
    expect(initialCount).toBe(0);

    // Add one product to the cart
    await inventoryPage.addToCart(PRODUCTS.backpack);

    // Verify the badge now shows "1"
    const updatedCount = await inventoryPage.getCartCount();
    expect(updatedCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // TEST 3: All expected products are present
  // -------------------------------------------------------------------------
  // Verifies that the product catalog hasn't changed unexpectedly.
  // This is also a non-regression check baked into smoke.
  // -------------------------------------------------------------------------

  test('should display all 6 known products by name', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    // Get all product name elements and extract their text
    const nameElements = inventoryPage.getAllProductNames();
    const names = await nameElements.allTextContents();

    // Assert: each known product name appears in the list
    expect(names).toContain(PRODUCTS.backpack);
    expect(names).toContain(PRODUCTS.bikeLight);
    expect(names).toContain(PRODUCTS.boltTshirt);
    expect(names).toContain(PRODUCTS.fleeceJacket);
    expect(names).toContain(PRODUCTS.onesie);
    expect(names).toContain(PRODUCTS.tshirtRed);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Cart badge shows correct count when adding multiple items
  // -------------------------------------------------------------------------

  test('should track count correctly when adding multiple products', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.addToCart(PRODUCTS.bikeLight);
    await inventoryPage.addToCart(PRODUCTS.boltTshirt);

    const count = await inventoryPage.getCartCount();
    expect(count).toBe(3);
  });
});
