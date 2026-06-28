// =============================================================================
// tests/e2e/checkout-flow.spec.ts — End-to-end purchase journey
// =============================================================================
// WHAT ARE E2E TESTS?
//   End-to-end tests simulate a complete real user journey from start to finish.
//   They cross multiple pages and verify that all pieces work together.
//
// WHAT THIS FILE TESTS:
//   The complete purchase flow:
//     Login → Add to cart → Go to cart → Checkout → Fill form → Confirm order
//
//   This is the most valuable business path: if a user can't complete a
//   purchase, the app has failed its core purpose.
//
// RUN: npx playwright test tests/e2e/checkout-flow.spec.ts
// =============================================================================

import { test, expect } from '../../fixtures/auth.fixture';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { PRODUCTS, CHECKOUT_INFO, CHECKOUT_ERRORS } from '../../utils/test-data';

test.describe('🛒 E2E — Complete Checkout Flow', () => {

  // -------------------------------------------------------------------------
  // TEST 1: The golden path — full purchase from login to confirmation
  // -------------------------------------------------------------------------
  // This is the most important E2E test in the suite.
  // It simulates exactly what a happy customer does.
  // -------------------------------------------------------------------------

  test('should complete a full purchase — login to order confirmation', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const cartPage = new CartPage(authenticatedPage);
    const checkoutPage = new CheckoutPage(authenticatedPage);

    // --- Step 1: Navigate to inventory and add a product ---
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack);

    // Verify cart badge shows 1 before proceeding
    expect(await inventoryPage.getCartCount()).toBe(1);

    // --- Step 2: Go to cart and verify the item is there ---
    await inventoryPage.goToCart();
    expect(await cartPage.getItemCount()).toBe(1);

    const itemName = await cartPage.getItemName(0);
    expect(itemName).toBe(PRODUCTS.backpack);

    // --- Step 3: Click Checkout to go to the personal info form ---
    await cartPage.clickCheckout();

    // We should now be on /checkout-step-one.html
    await expect(authenticatedPage).toHaveURL(/checkout-step-one/);

    // --- Step 4: Fill the checkout form with valid data ---
    await checkoutPage.fillPersonalInfo(
      CHECKOUT_INFO.valid.firstName,
      CHECKOUT_INFO.valid.lastName,
      CHECKOUT_INFO.valid.postalCode
    );
    await checkoutPage.clickContinue();

    // --- Step 5: Verify the order summary on step two ---
    await expect(authenticatedPage).toHaveURL(/checkout-step-two/);

    // The total price label should be visible
    const total = await checkoutPage.getTotalPrice();
    // The backpack costs $29.99 + tax — total label starts with "Total:"
    expect(total).toContain('Total:');

    // --- Step 6: Confirm the order ---
    await checkoutPage.clickFinish();

    // --- Step 7: Assert the confirmation page ---
    await checkoutPage.expectOrderConfirmed();
  });

  // -------------------------------------------------------------------------
  // TEST 2: Add multiple products and verify cart count at each step
  // -------------------------------------------------------------------------

  test('should add multiple products and show correct count throughout', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const cartPage = new CartPage(authenticatedPage);

    await inventoryPage.goto();

    // Add 3 different products
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.addToCart(PRODUCTS.bikeLight);
    await inventoryPage.addToCart(PRODUCTS.fleeceJacket);

    // Cart badge must show 3
    expect(await inventoryPage.getCartCount()).toBe(3);

    // Navigate to cart and verify all 3 items are listed
    await inventoryPage.goToCart();
    expect(await cartPage.getItemCount()).toBe(3);
  });

  // -------------------------------------------------------------------------
  // TEST 3: Remove a product from the cart
  // -------------------------------------------------------------------------

  test('should remove a product from the cart', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const cartPage = new CartPage(authenticatedPage);

    await inventoryPage.goto();

    // Add two products
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.addToCart(PRODUCTS.bikeLight);

    await inventoryPage.goToCart();

    // Before removal: 2 items
    expect(await cartPage.getItemCount()).toBe(2);

    // Remove one product by name
    await cartPage.removeItem(PRODUCTS.backpack);

    // After removal: 1 item remains
    expect(await cartPage.getItemCount()).toBe(1);

    // The remaining item should be the bike light
    const remainingName = await cartPage.getItemName(0);
    expect(remainingName).toBe(PRODUCTS.bikeLight);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Continue Shopping from cart returns to inventory
  // -------------------------------------------------------------------------

  test('should return to inventory when clicking Continue Shopping', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const cartPage = new CartPage(authenticatedPage);

    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.onesie);
    await inventoryPage.goToCart();

    // Click "Continue Shopping" — should navigate back to inventory
    await cartPage.clickContinueShopping();

    // Verify we're back and the inventory is visible
    await inventoryPage.expectLoaded();

    // The product we added should now show "Remove" instead of "Add to cart"
    // This verifies cart state persists when returning to inventory
    const onesieItem = authenticatedPage
      .locator('.inventory_item')
      .filter({ hasText: PRODUCTS.onesie });
    await expect(onesieItem.locator('button')).toHaveText('Remove');
  });

  // -------------------------------------------------------------------------
  // TEST 5: Checkout form validation — missing first name
  // -------------------------------------------------------------------------
  // Each required field shows a specific error message.
  // We test each field in isolation to verify the validation messages.
  // -------------------------------------------------------------------------

  test('should show error when first name is missing on checkout', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const cartPage = new CartPage(authenticatedPage);
    const checkoutPage = new CheckoutPage(authenticatedPage);

    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.goToCart();
    await cartPage.clickCheckout();

    // Fill form with missing first name
    await checkoutPage.fillPersonalInfo(
      CHECKOUT_INFO.missingFirstName.firstName,
      CHECKOUT_INFO.missingFirstName.lastName,
      CHECKOUT_INFO.missingFirstName.postalCode
    );
    await checkoutPage.clickContinue();

    // Assert the correct error message appears
    await checkoutPage.expectStepOneError(CHECKOUT_ERRORS.firstNameRequired);

    // We should still be on step one
    await expect(authenticatedPage).toHaveURL(/checkout-step-one/);
  });

  // -------------------------------------------------------------------------
  // TEST 6: Checkout form validation — missing last name
  // -------------------------------------------------------------------------

  test('should show error when last name is missing on checkout', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const cartPage = new CartPage(authenticatedPage);
    const checkoutPage = new CheckoutPage(authenticatedPage);

    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.goToCart();
    await cartPage.clickCheckout();

    await checkoutPage.fillPersonalInfo(
      CHECKOUT_INFO.missingLastName.firstName,
      CHECKOUT_INFO.missingLastName.lastName,
      CHECKOUT_INFO.missingLastName.postalCode
    );
    await checkoutPage.clickContinue();

    await checkoutPage.expectStepOneError(CHECKOUT_ERRORS.lastNameRequired);
  });

  // -------------------------------------------------------------------------
  // TEST 7: Checkout form validation — missing postal code
  // -------------------------------------------------------------------------

  test('should show error when postal code is missing on checkout', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const cartPage = new CartPage(authenticatedPage);
    const checkoutPage = new CheckoutPage(authenticatedPage);

    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.goToCart();
    await cartPage.clickCheckout();

    await checkoutPage.fillPersonalInfo(
      CHECKOUT_INFO.missingPostalCode.firstName,
      CHECKOUT_INFO.missingPostalCode.lastName,
      CHECKOUT_INFO.missingPostalCode.postalCode
    );
    await checkoutPage.clickContinue();

    await checkoutPage.expectStepOneError(CHECKOUT_ERRORS.postalCodeRequired);
  });
});
