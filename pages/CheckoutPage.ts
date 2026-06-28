// =============================================================================
// pages/CartPage.ts — Page Object Model for the cart page
// =============================================================================

import { Page, Locator, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;

  // All cart item rows
  readonly cartItems: Locator;

  // The "Continue Shopping" button
  readonly continueShoppingButton: Locator;

  // The "Checkout" button
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.locator('.cart_item');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/cart.html');
  }

  // Returns the number of items currently in the cart
  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  // Returns the name of a cart item by its index (0-based)
  async getItemName(index: number): Promise<string> {
    return (
      (await this.cartItems
        .nth(index)
        .locator('.inventory_item_name')
        .textContent()) ?? ''
    );
  }

  // Removes an item from the cart by its product name
  async removeItem(productName: string): Promise<void> {
    const item = this.cartItems.filter({ hasText: productName });
    await item.locator('button').click();
  }

  async clickCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await expect(this.page).toHaveURL(/checkout-step-one/);
  }

  async clickContinueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
    await expect(this.page).toHaveURL(/inventory/);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/cart/);
  }
}

// =============================================================================
// pages/CheckoutPage.ts — Page Object Model for the multi-step checkout
// =============================================================================
// SauceDemo has 3 checkout steps:
//   Step 1: /checkout-step-one.html — Personal info form
//   Step 2: /checkout-step-two.html — Order summary
//   Step 3: /checkout-complete.html — Confirmation
// =============================================================================

export class CheckoutPage {
  readonly page: Page;

  // Step 1 — Personal info inputs
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;

  // Step 1 — Error message
  readonly errorMessage: Locator;

  // Step 2 — Order summary
  readonly summaryItems: Locator;
  readonly totalPrice: Locator;
  readonly finishButton: Locator;

  // Step 3 — Confirmation
  readonly confirmationHeader: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 1 inputs — identified by data-test attributes
    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.errorMessage = page.locator('[data-test="error"]');

    // Step 2 elements
    this.summaryItems = page.locator('.summary_info');
    this.totalPrice = page.locator('.summary_total_label');
    this.finishButton = page.locator('[data-test="finish"]');

    // Step 3 confirmation text
    this.confirmationHeader = page.locator('.complete-header');
  }

  // ----- Step 1 actions -----

  async fillPersonalInfo(
    firstName: string,
    lastName: string,
    postalCode: string
  ): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }

  async expectStepOneError(message: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  // ----- Step 2 actions -----

  async getTotalPrice(): Promise<string> {
    return (await this.totalPrice.textContent()) ?? '';
  }

  async clickFinish(): Promise<void> {
    await this.finishButton.click();
    await expect(this.page).toHaveURL(/checkout-complete/);
  }

  // ----- Step 3 assertion -----

  async expectOrderConfirmed(): Promise<void> {
    await expect(this.confirmationHeader).toBeVisible();
    await expect(this.confirmationHeader).toContainText(
      'Thank you for your order!'
    );
  }
}
