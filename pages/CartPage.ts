// =============================================================================
// pages/CartPage.ts — Shopping cart (/cart.html)
// =============================================================================
// v1 bug fixed: this class used to live inside CheckoutPage.ts while specs
// imported '../../pages/CartPage', which broke the whole e2e checkout suite.
// =============================================================================

import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from './components/Header';
import { parsePrice } from '../utils/helpers';
import { ROUTES, type ProductName } from '../utils/test-data';

export class CartPage {
  readonly header: Header;
  readonly cartItems: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;
  readonly itemQuantities: Locator;
  readonly continueShoppingButton: Locator;
  readonly checkoutButton: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.cartItems = page.getByTestId('cart-list').getByTestId('inventory-item');
    this.itemNames = this.cartItems.getByTestId('inventory-item-name');
    this.itemPrices = this.cartItems.getByTestId('inventory-item-price');
    this.itemQuantities = this.cartItems.getByTestId('item-quantity');
    this.continueShoppingButton = page.getByTestId('continue-shopping');
    this.checkoutButton = page.getByTestId('checkout');
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.cart);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/cart\.html/);
    await expect(this.header.title).toHaveText('Your Cart');
  }

  item(name: ProductName): Locator {
    return this.cartItems.filter({ hasText: name });
  }

  async expectItems(names: readonly string[]): Promise<void> {
    await expect(this.itemNames).toHaveText([...names]);
  }

  async removeItem(name: ProductName): Promise<void> {
    await this.item(name).getByRole('button', { name: 'Remove' }).click();
  }

  async prices(): Promise<number[]> {
    return (await this.itemPrices.allTextContents()).map(parsePrice);
  }

  async clickCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await expect(this.page).toHaveURL(/checkout-step-one\.html/);
  }

  async clickContinueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
    await expect(this.page).toHaveURL(/inventory\.html/);
  }

  // ---- v1 compatibility helpers ------------------------------------------
  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async getItemName(index: number): Promise<string> {
    return (await this.itemNames.nth(index).textContent()) ?? '';
  }
}
