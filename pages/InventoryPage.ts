// =============================================================================
// pages/InventoryPage.ts — Product list (/inventory.html)
// =============================================================================

import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from './components/Header';
import { parsePrice } from '../utils/helpers';
import { ROUTES, type ProductName } from '../utils/test-data';

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

export class InventoryPage {
  readonly header: Header;
  readonly inventoryList: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;
  readonly sortDropdown: Locator;
  readonly activeSortOption: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.inventoryList = page.getByTestId('inventory-list');
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.itemPrices = page.getByTestId('inventory-item-price');
    this.sortDropdown = page.getByTestId('product-sort-container');
    this.activeSortOption = page.getByTestId('active-option');
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.inventory);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.inventoryList).toBeVisible();
    await expect(this.header.title).toHaveText('Products');
  }

  /** Product card scoped by its visible name (robust to re-ordering). */
  item(name: ProductName): Locator {
    return this.items.filter({ has: this.page.getByTestId('inventory-item-name').getByText(name, { exact: true }) });
  }

  async addToCart(name: ProductName): Promise<void> {
    await this.item(name).getByRole('button', { name: 'Add to cart' }).click();
  }

  async removeFromCart(name: ProductName): Promise<void> {
    await this.item(name).getByRole('button', { name: 'Remove' }).click();
  }

  async openProduct(name: ProductName): Promise<void> {
    await this.item(name).getByTestId('inventory-item-name').click();
    await expect(this.page).toHaveURL(/inventory-item\.html\?id=\d+/);
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async names(): Promise<string[]> {
    return this.itemNames.allTextContents();
  }

  async prices(): Promise<number[]> {
    return (await this.itemPrices.allTextContents()).map(parsePrice);
  }

  // ---- v1 compatibility helpers ------------------------------------------
  getAllProductNames(): Locator {
    return this.itemNames;
  }

  getAllProductPrices(): Locator {
    return this.itemPrices;
  }

  async goToCart(): Promise<void> {
    await this.header.openCart();
  }
}
