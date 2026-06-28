// =============================================================================
// pages/InventoryPage.ts — Page Object Model for the product list page
// =============================================================================

import { Page, Locator, expect } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;

  // The container for all product cards
  readonly inventoryList: Locator;

  // The sort dropdown in the top-right corner
  readonly sortDropdown: Locator;

  // The cart icon with the item count badge
  readonly cartIcon: Locator;

  // The badge showing the number of items in cart
  readonly cartBadge: Locator;

  // The hamburger menu button (top-left)
  readonly menuButton: Locator;

  // The "Logout" option inside the hamburger menu
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inventoryList = page.locator('.inventory_list');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.cartIcon = page.locator('.shopping_cart_link');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
  }

  // Navigate directly to the inventory page
  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
  }

  // Returns all product name elements on the page
  getAllProductNames(): Locator {
    return this.page.locator('.inventory_item_name');
  }

  // Returns all product price elements on the page
  getAllProductPrices(): Locator {
    return this.page.locator('.inventory_item_price');
  }

  // Adds a product to cart by its name
  async addToCart(productName: string): Promise<void> {
    const item = this.page
      .locator('.inventory_item')
      .filter({ hasText: productName });

    // The Add to cart button inside this specific product card
    await item.locator('button').click();
  }

  // Removes a product from cart (when it shows "Remove" instead of "Add to cart")
  async removeFromCart(productName: string): Promise<void> {
    const item = this.page
      .locator('.inventory_item')
      .filter({ hasText: productName });
    await item.locator('button').click();
  }

  // Returns the number shown on the cart badge (0 if empty)
  async getCartCount(): Promise<number> {
    const isVisible = await this.cartBadge.isVisible();
    if (!isVisible) return 0;
    const text = await this.cartBadge.textContent();
    return parseInt(text ?? '0', 10);
  }

  // Selects a sort option from the dropdown
  // Values: 'az', 'za', 'lohi', 'hilo'
  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.sortDropdown.selectOption(value);
  }

  // Clicks the cart icon to navigate to the cart page
  async goToCart(): Promise<void> {
    await this.cartIcon.click();
    await expect(this.page).toHaveURL(/cart/);
  }

  // Opens the hamburger menu and clicks Logout
  async logout(): Promise<void> {
    await this.menuButton.click();
    // Wait for the menu animation to complete before clicking
    await this.logoutLink.waitFor({ state: 'visible' });
    await this.logoutLink.click();
    await expect(this.page).toHaveURL('/');
  }

  // Asserts that the page is loaded (inventory list is visible)
  async expectLoaded(): Promise<void> {
    await expect(this.inventoryList).toBeVisible();
  }
}
