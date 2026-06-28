// =============================================================================
// tests/e2e/sorting.spec.ts — Product sorting E2E tests
// =============================================================================
// SauceDemo allows users to sort the product list 4 ways.
// These tests verify that sorting actually changes the displayed order.
// =============================================================================

import { test, expect } from '../../fixtures/auth.fixture';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('🔃 E2E — Product Sorting', () => {

  // -------------------------------------------------------------------------
  // TEST 1: Sort A→Z (default)
  // -------------------------------------------------------------------------

  test('should sort products A→Z by name (default)', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    // Select "Name (A to Z)" — value 'az'
    await inventoryPage.sortBy('az');

    // Get all product names in current DOM order
    const names = await inventoryPage.getAllProductNames().allTextContents();

    // Create a sorted copy and compare — they must match
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  // -------------------------------------------------------------------------
  // TEST 2: Sort Z→A
  // -------------------------------------------------------------------------

  test('should sort products Z→A by name', async ({ authenticatedPage }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    await inventoryPage.sortBy('za');

    const names = await inventoryPage.getAllProductNames().allTextContents();

    // Reverse alphabetical — create sorted copy, reverse it
    const sortedDesc = [...names].sort().reverse();
    expect(names).toEqual(sortedDesc);
  });

  // -------------------------------------------------------------------------
  // TEST 3: Sort by price low → high
  // -------------------------------------------------------------------------

  test('should sort products by price low to high', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    await inventoryPage.sortBy('lohi');

    // Get price texts like "$7.99", "$9.99", etc.
    const priceTexts = await inventoryPage
      .getAllProductPrices()
      .allTextContents();

    // Parse to float by removing the "$" sign
    const prices = priceTexts.map((p) => parseFloat(p.replace('$', '')));

    // Verify each price is less than or equal to the next one
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
    }
  });

  // -------------------------------------------------------------------------
  // TEST 4: Sort by price high → low
  // -------------------------------------------------------------------------

  test('should sort products by price high to low', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    await inventoryPage.sortBy('hilo');

    const priceTexts = await inventoryPage
      .getAllProductPrices()
      .allTextContents();
    const prices = priceTexts.map((p) => parseFloat(p.replace('$', '')));

    // Verify each price is greater than or equal to the next one
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
    }
  });
});

// =============================================================================
// tests/e2e/product-detail.spec.ts — Product detail page E2E tests
// =============================================================================

test.describe('📦 E2E — Product Detail Page', () => {

  test('should open product detail when clicking product name', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    // Click the first product name link
    await authenticatedPage.locator('.inventory_item_name').first().click();

    // Assert: URL changed to a detail page (contains "inventory-item")
    await expect(authenticatedPage).toHaveURL(/inventory-item/);
  });

  test('should display product name, description and price on detail page', async ({
    authenticatedPage,
  }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.goto();

    // Click the backpack product name
    await authenticatedPage
      .locator('.inventory_item_name')
      .filter({ hasText: 'Sauce Labs Backpack' })
      .click();

    // The detail page must show the product name
    await expect(
      authenticatedPage.locator('.inventory_details_name')
    ).toContainText('Sauce Labs Backpack');

    // The description must be present and non-empty
    const description = authenticatedPage.locator('.inventory_details_desc');
    await expect(description).toBeVisible();
    const descText = await description.textContent();
    expect(descText?.trim().length).toBeGreaterThan(0);

    // The price must be visible and match the expected format ($XX.XX)
    const price = authenticatedPage.locator('.inventory_details_price');
    await expect(price).toContainText('$29.99');
  });

  test('should add product to cart from detail page', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/inventory.html');

    // Click the first product to open its detail page
    await authenticatedPage.locator('.inventory_item_name').first().click();

    // Click "Add to cart" from the detail page
    await authenticatedPage.locator('[data-test="add-to-cart"]').click();

    // The cart badge must now show "1"
    const badge = authenticatedPage.locator('.shopping_cart_badge');
    await expect(badge).toHaveText('1');
  });

  test('should return to inventory when clicking Back button', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/inventory.html');

    // Navigate to a product detail page
    await authenticatedPage.locator('.inventory_item_name').first().click();
    await expect(authenticatedPage).toHaveURL(/inventory-item/);

    // Click the "Back to products" button
    await authenticatedPage.locator('[data-test="back-to-products"]').click();

    // Assert: we're back on the inventory page
    await expect(authenticatedPage).toHaveURL(/inventory/);
    await expect(
      authenticatedPage.locator('.inventory_list')
    ).toBeVisible();
  });
});
