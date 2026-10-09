// =============================================================================
// pages/ProductDetailPage.ts — Product detail (/inventory-item.html?id=N)
// =============================================================================

import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from './components/Header';
import { parsePrice } from '../utils/helpers';
import { ROUTES } from '../utils/test-data';

export class ProductDetailPage {
  readonly header: Header;
  readonly name: Locator;
  readonly description: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;
  readonly removeButton: Locator;
  readonly backButton: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.name = page.getByTestId('inventory-item-name');
    this.description = page.getByTestId('inventory-item-desc');
    this.price = page.getByTestId('inventory-item-price');
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    this.removeButton = page.getByRole('button', { name: 'Remove' });
    this.backButton = page.getByTestId('back-to-products');
  }

  async goto(id: number): Promise<void> {
    await this.page.goto(ROUTES.productDetail(id));
  }

  async priceValue(): Promise<number> {
    return parsePrice(await this.price.textContent());
  }

  async backToProducts(): Promise<void> {
    await this.backButton.click();
    await expect(this.page).toHaveURL(/inventory\.html/);
  }
}
