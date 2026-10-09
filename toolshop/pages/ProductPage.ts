// toolshop/pages/ProductPage.ts — product detail (/product/:id)
import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from './components/Header';

export class ProductPage {
  readonly header: Header;
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly description: Locator;
  readonly quantity: Locator;
  readonly increase: Locator;
  readonly decrease: Locator;
  readonly addToCart: Locator;
  readonly addToFavorites: Locator;
  readonly outOfStock: Locator;
  readonly toast: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.description = page.getByTestId('product-description');
    this.quantity = page.getByTestId('quantity');
    this.increase = page.getByTestId('increase-quantity');
    this.decrease = page.getByTestId('decrease-quantity');
    this.addToCart = page.getByTestId('add-to-cart');
    this.addToFavorites = page.getByTestId('add-to-favorites');
    this.outOfStock = page.getByTestId('out-of-stock');
    this.toast = page.getByRole('alert');
  }

  async goto(productId: string): Promise<void> {
    await this.page.goto(`/product/${productId}`);
    await expect(this.name).toBeVisible();
  }

  /** Adds `quantity` units and waits for the cart API call to succeed. */
  async add(quantity = 1): Promise<void> {
    await this.quantity.fill(String(quantity));
    await Promise.all([
      this.page.waitForResponse((r) => /\/carts\/[0-9a-z]{26}$/i.test(r.url()) && r.request().method() === 'POST' && r.ok()),
      this.addToCart.click(),
    ]);
  }
}
